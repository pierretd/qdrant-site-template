try:
    from fastapi import FastAPI, HTTPException, Query
    from fastapi.middleware.cors import CORSMiddleware
    from qdrant_client import QdrantClient
    from sentence_transformers import SentenceTransformer
    from typing import List
    from pydantic import BaseModel
    from urllib.parse import unquote
    import os
    import logging
except ImportError as e:
    print(f"Failed to import required modules: {str(e)}")
    raise

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
class Config:
    QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
    QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
    COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "h&m-mini")
    EMBEDDING_MODEL = "clip-ViT-B-32"
    GROUP_ORDER = ["Menswear", "Ladieswear", "Divided", "Baby/Children", "Sport"]

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
        self.client = QdrantClient(
            url=Config.QDRANT_URL,
            api_key=Config.QDRANT_API_KEY if Config.QDRANT_API_KEY else None
        )
        self.encoder = SentenceTransformer(Config.EMBEDDING_MODEL)

    def create_filter(self, groups: List[str] = None, items: List[str] = None) -> dict:
        must_conditions = []
        if groups:
            must_conditions.append({
                "key": "index_group_name",
                "match": {"any": groups}
            })
        if items:
            must_conditions.append({
                "key": "product_type_name",
                "match": {"any": items}
            })
        return {"must": must_conditions} if must_conditions else None

    async def search(self, query: str, groups: List[str], items: List[str], 
                    limit: int, offset: int) -> List[SearchResult]:
        conditions = self.create_filter(groups, items)
        
        try:
            if not query:
                results = self.client.scroll(
                    collection_name=Config.COLLECTION_NAME,
                    limit=limit,
                    offset=offset,
                    scroll_filter=conditions,
                    with_payload=True,
                    with_vectors=False
                )[0]
            else:
                query_vector = self.encoder.encode(query).tolist()
                results = self.client.search(
                    collection_name=Config.COLLECTION_NAME,
                    query_vector=query_vector,
                    limit=limit,
                    offset=offset,
                    query_filter=conditions,
                    with_payload=True
                )

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
            raise HTTPException(
                status_code=500, 
                detail=f"Search error: {str(e)}"
            )

    async def get_groups(self) -> List[str]:
        try:
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

            return [g for g in Config.GROUP_ORDER if g in groups] + sorted(groups - set(Config.GROUP_ORDER))
            
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to fetch groups: {str(e)}"
            )

# Initialize FastAPI and services
app = FastAPI(title="H&M Fashion Search API")
qdrant_service = QdrantService()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://qdrant-site-template.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/search", response_model=List[SearchResult])
async def search_fashion_items(
    query: str = "", 
    group: List[str] = Query(default=[]),
    item: List[str] = Query(default=[]),
    limit: int = 20,
    offset: int = 0
):
    """Search for fashion items using semantic search and/or filters."""
    query = unquote(query.strip())
    groups = [unquote(g.strip()) for g in group]
    items = [unquote(i.strip()) for i in item]
    return await qdrant_service.search(query, groups, items, limit, offset)

@app.get("/groups", response_model=List[str])
async def get_groups():
    """Get list of unique index group names in specified order."""
    return await qdrant_service.get_groups()

# Add a root endpoint for health check
@app.get("/")
async def root():
    return {"status": "ok", "message": "H&M Fashion Search API is running"} 