try:
    from fastapi import FastAPI, HTTPException, Query
    from fastapi.middleware.cors import CORSMiddleware
    from qdrant_client import QdrantClient
    from fastembed import TextEmbedding
    from typing import List
    from pydantic import BaseModel
    from urllib.parse import unquote
    import os
    import logging
    from dotenv import load_dotenv
except ImportError as e:
    print(f"Failed to import required modules: {str(e)}")
    raise

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
class Config:
    QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
    QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
    COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "h&m-mini")
    # Using the appropriate text model for CLIP embeddings
    TEXT_EMBEDDING_MODEL = "Qdrant/clip-ViT-B-32-text"  # The text encoder part of CLIP
    GROUP_ORDER = ["Menswear", "Ladieswear", "Divided", "Baby/Children", "Sport"]
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

class SearchResult(BaseModel):
    image_url: str
    prod_name: str
    detail_desc: str
    product_type_name: str
    index_group_name: str
    price: float = 0.0
    article_id: str = ""
    available: bool = True
    color: str = ""
    size: str = ""

    class Config:
        from_attributes = True

class QdrantService:
    def __init__(self):
        logger.info(f"Connecting to Qdrant at {Config.QDRANT_URL}")
        try:
            # First try to connect to Qdrant
            self.client = QdrantClient(
                url=Config.QDRANT_URL,
                api_key=Config.QDRANT_API_KEY if Config.QDRANT_API_KEY else None
            )
            logger.info(f"Successfully connected to Qdrant")
            
            # Verify connection by making a simple call
            try:
                collection_info = self.client.get_collection(Config.COLLECTION_NAME)
                logger.info(f"Successfully verified collection {Config.COLLECTION_NAME}")
                logger.info(f"Collection info: {collection_info}")
            except Exception as e:
                logger.error(f"Failed to get collection info: {str(e)}")
                raise Exception(f"Failed to access collection {Config.COLLECTION_NAME}: {str(e)}")
            
            # Initialize TextEmbedding with CLIP model
            try:
                self.encoder = TextEmbedding(model_name=Config.TEXT_EMBEDDING_MODEL)
                logger.info(f"Initialized TextEmbedding with model {Config.TEXT_EMBEDDING_MODEL}")
            except Exception as e:
                logger.error(f"Failed to initialize TextEmbedding: {str(e)}")
                raise Exception(f"Failed to initialize embedding model {Config.TEXT_EMBEDDING_MODEL}: {str(e)}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Qdrant service: {str(e)}")
            raise

    def create_filter(self, groups: List[str] = None, items: List[str] = None) -> dict:
        must_conditions = []
        if groups and len(groups) > 0:
            must_conditions.append({
                "key": "index_group_name",
                "match": {"any": groups}
            })
        if items and len(items) > 0:
            must_conditions.append({
                "key": "product_type_name",
                "match": {"any": items}
            })
        return {"must": must_conditions} if must_conditions else None

    async def search(self, query: str, groups: List[str], items: List[str], 
                    limit: int, offset: int) -> List[SearchResult]:
        conditions = self.create_filter(groups, items)
        
        try:
            logger.info(f"Searching with query: '{query}', filters: {conditions}, limit: {limit}, offset: {offset}")
            
            if not query:
                logger.info("Performing scroll search (no query)")
                results = self.client.scroll(
                    collection_name=Config.COLLECTION_NAME,
                    limit=limit,
                    offset=offset,
                    scroll_filter=conditions,
                    with_payload=True,
                    with_vectors=False
                )[0]
            else:
                logger.info("Performing vector search")
                # Generate embedding from text query using fastembed TextEmbedding
                embeddings = list(self.encoder.embed([query]))
                query_vector = embeddings[0].tolist()
                logger.info(f"Generated embedding vector with dimension: {len(query_vector)}")
                results = self.client.search(
                    collection_name=Config.COLLECTION_NAME,
                    query_vector=query_vector,
                    limit=limit,
                    offset=offset,
                    query_filter=conditions,
                    with_payload=True
                )

            logger.info(f"Found {len(results)} results")
            
            return [
                SearchResult(
                    image_url=hit.payload.get('image_url', ''),
                    prod_name=hit.payload.get('prod_name', 'Unknown Product'),
                    detail_desc=hit.payload.get('detail_desc', 'No description available'),
                    product_type_name=hit.payload.get('product_type_name', ''),
                    index_group_name=hit.payload.get('index_group_name', ''),
                    price=float(hit.payload.get('price', 0.0)),
                    article_id=hit.payload.get('article_id', ''),
                    available=hit.payload.get('available', True),
                    color=hit.payload.get('colour_group_name', ''),
                    size=hit.payload.get('size', '')
                ) 
                for hit in results
            ]
        except Exception as e:
            logger.error(f"Search error: {str(e)}")
            raise HTTPException(
                status_code=500, 
                detail=f"Search error: {str(e)}"
            )

    async def get_groups(self) -> List[str]:
        try:
            logger.info("Fetching product groups")
            groups = set()
            offset = 0
            limit = 100
            
            while True:
                results = self.client.scroll(
                    collection_name=Config.COLLECTION_NAME,
                    limit=limit,
                    offset=offset,
                    with_payload=["index_group_name"]
                )[0]
                
                if not results:
                    break
                    
                groups.update(
                    result.payload.get('index_group_name') 
                    for result in results 
                    if result.payload.get('index_group_name')
                )
                offset += limit

            ordered_groups = [g for g in Config.GROUP_ORDER if g in groups] + sorted(groups - set(Config.GROUP_ORDER))
            logger.info(f"Found {len(ordered_groups)} product groups")
            return ordered_groups
            
        except Exception as e:
            logger.error(f"Failed to fetch groups: {str(e)}")
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to fetch groups: {str(e)}"
            )

    async def get_featured_products(self, limit_per_category: int = 4) -> dict:
        """Get featured products from each category for the landing page."""
        logger.info(f"Getting featured products, {limit_per_category} per category")
        
        try:
            # Get all available categories
            groups = await self.get_groups()
            
            result = {}
            
            # For each category, get a few items
            for group in groups:
                logger.info(f"Getting featured products for category: {group}")
                
                # Create a filter for this category
                conditions = {
                    "must": [
                        {
                            "key": "index_group_name",
                            "match": {"value": group}
                        }
                    ]
                }
                
                # Get some products from this category
                category_results = self.client.scroll(
                    collection_name=Config.COLLECTION_NAME,
                    limit=limit_per_category,
                    scroll_filter=conditions,
                    with_payload=True,
                    with_vectors=False
                )[0]
                
                if category_results:
                    # Convert to SearchResult objects
                    result[group] = [
                        SearchResult(
                            image_url=hit.payload.get('image_url', ''),
                            prod_name=hit.payload.get('prod_name', 'Unknown Product'),
                            detail_desc=hit.payload.get('detail_desc', 'No description available'),
                            product_type_name=hit.payload.get('product_type_name', ''),
                            index_group_name=hit.payload.get('index_group_name', ''),
                            price=float(hit.payload.get('price', 0.0)),
                            article_id=hit.payload.get('article_id', ''),
                            available=hit.payload.get('available', True),
                            color=hit.payload.get('colour_group_name', ''),
                            size=hit.payload.get('size', '')
                        ) 
                        for hit in category_results
                    ]
            
            logger.info(f"Retrieved featured products for {len(result)} categories")
            return result
            
        except Exception as e:
            logger.error(f"Error getting featured products: {str(e)}")
            raise HTTPException(
                status_code=500, 
                detail=f"Error getting featured products: {str(e)}"
            )

# Initialize FastAPI and services
app = FastAPI(title="H&M Fashion Search API")

# Initialize Qdrant service
try:
    logger.info("Attempting to initialize Qdrant service...")
    qdrant_service = QdrantService()
    logger.info("Qdrant service initialized successfully")
except Exception as e:
    error_msg = f"Failed to initialize Qdrant service: {str(e)}"
    logger.error(error_msg)
    # We'll still define the variable to avoid NameError, but API calls will fail
    qdrant_service = None

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint for health check
@app.get("/")
async def root():
    status = "ok" if qdrant_service is not None else "degraded"
    return {
        "status": status, 
        "message": "H&M Fashion Search API is running",
        "qdrant_url": Config.QDRANT_URL,
        "collection": Config.COLLECTION_NAME
    }

# Search endpoint
@app.get("/search", response_model=List[SearchResult])
async def search_fashion_items(
    query: str = "", 
    group: List[str] = Query(default=[]),
    item: List[str] = Query(default=[]),
    limit: int = 20,
    offset: int = 0
):
    """Search for fashion items using semantic search and/or filters."""
    if qdrant_service is None:
        raise HTTPException(status_code=503, detail="Qdrant service is not available")
        
    query = unquote(query.strip())
    groups = [unquote(g.strip()) for g in group]
    items = [unquote(i.strip()) for i in item]
    
    logger.info(f"Search request: query='{query}', groups={groups}, items={items}, limit={limit}, offset={offset}")
    
    return await qdrant_service.search(query, groups, items, limit, offset)

# Groups endpoint
@app.get("/groups", response_model=List[str])
async def get_groups():
    """Get list of unique index group names in specified order."""
    if qdrant_service is None:
        raise HTTPException(status_code=503, detail="Qdrant service is not available")
        
    return await qdrant_service.get_groups()

# Add API prefix endpoints for Next.js
@app.get("/api/py/")
async def api_root():
    return await root()

@app.get("/api/py/search", response_model=List[SearchResult])
async def api_search_fashion_items(
    query: str = "", 
    group: List[str] = Query(default=[]),
    item: List[str] = Query(default=[]),
    limit: int = 20,
    offset: int = 0
):
    return await search_fashion_items(query, group, item, limit, offset)

@app.get("/api/py/groups", response_model=List[str])
async def api_get_groups():
    return await get_groups()

# Add a diagnostic endpoint
@app.get("/api/py/diagnostic")
async def diagnostic():
    """Diagnostic endpoint to check all components of the system."""
    results = {
        "app_status": "ok",
        "qdrant_service": "not_initialized",
        "qdrant_url": Config.QDRANT_URL,
        "qdrant_api_key_provided": bool(Config.QDRANT_API_KEY),
        "collection_name": Config.COLLECTION_NAME,
        "text_model": Config.TEXT_EMBEDDING_MODEL,
        "environment_variables": {
            "QDRANT_URL": os.getenv("QDRANT_URL", "not set"),
            "QDRANT_API_KEY": "provided" if os.getenv("QDRANT_API_KEY") else "not set",
            "QDRANT_COLLECTION": os.getenv("QDRANT_COLLECTION", "not set"),
        }
    }
    
    # Test Qdrant connection
    if qdrant_service is None:
        results["qdrant_service"] = "failed_to_initialize"
    else:
        results["qdrant_service"] = "initialized"
        try:
            # Try to get collection info
            client = QdrantClient(
                url=Config.QDRANT_URL,
                api_key=Config.QDRANT_API_KEY if Config.QDRANT_API_KEY else None
            )
            collection_info = client.get_collection(Config.COLLECTION_NAME)
            results["qdrant_connection"] = "ok"
            results["collection_info"] = {
                "status": "ok",
                "vectors_count": collection_info.vectors_count,
                "points_count": collection_info.points_count,
                "vector_size": collection_info.config.params.vectors.size,
            }
        except Exception as e:
            results["qdrant_connection"] = "error"
            results["qdrant_error"] = str(e)
    
    return results 

# Add a new endpoint for featured products
@app.get("/featured", response_model=dict)
async def get_featured_products(limit_per_category: int = 4):
    """Get featured products from each category for the landing page."""
    if qdrant_service is None:
        raise HTTPException(status_code=503, detail="Qdrant service is not available")
        
    return await qdrant_service.get_featured_products(limit_per_category)

# Add API prefix endpoint for featured products
@app.get("/api/py/featured", response_model=dict)
async def api_get_featured_products(limit_per_category: int = 4):
    """Get featured products from each category for the landing page."""
    return await get_featured_products(limit_per_category) 