#!/usr/bin/env python3
"""
Script to check if the Qdrant Cloud connection is working properly.
Run this script to verify your Qdrant Cloud credentials.
"""

import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get Qdrant configuration from environment variables
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION")

def check_qdrant_connection():
    """Check if the Qdrant Cloud connection is working properly."""
    logger.info(f"Checking Qdrant connection to {QDRANT_URL}")
    logger.info(f"Collection name: {COLLECTION_NAME}")
    
    try:
        # Initialize Qdrant client
        client = QdrantClient(
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY
        )
        
        # Check if collection exists
        collections = client.get_collections()
        logger.info(f"Available collections: {[c.name for c in collections.collections]}")
        
        if COLLECTION_NAME not in [c.name for c in collections.collections]:
            logger.error(f"Collection '{COLLECTION_NAME}' not found!")
            return False
        
        # Get collection info
        collection_info = client.get_collection(collection_name=COLLECTION_NAME)
        logger.info(f"Collection info: {collection_info}")
        
        # Count points in collection
        count = client.count(collection_name=COLLECTION_NAME)
        logger.info(f"Number of points in collection: {count.count}")
        
        # Get a sample point
        sample = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=1,
            with_payload=True
        )[0]
        
        if sample:
            logger.info(f"Sample point payload keys: {sample[0].payload.keys()}")
            
        logger.info("✅ Qdrant connection successful!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error connecting to Qdrant: {str(e)}")
        return False

if __name__ == "__main__":
    if not QDRANT_URL or not QDRANT_API_KEY or not COLLECTION_NAME:
        logger.error("Missing Qdrant configuration in environment variables!")
        logger.error(f"QDRANT_URL: {'✅ Set' if QDRANT_URL else '❌ Missing'}")
        logger.error(f"QDRANT_API_KEY: {'✅ Set' if QDRANT_API_KEY else '❌ Missing'}")
        logger.error(f"QDRANT_COLLECTION: {'✅ Set' if COLLECTION_NAME else '❌ Missing'}")
        exit(1)
        
    check_qdrant_connection() 