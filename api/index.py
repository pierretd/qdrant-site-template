from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import os
import sys

# Add the current directory to the path so we can import from main.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the app from main.py
from main import app as main_app

# Create a handler for Vercel serverless functions
async def handler(request: Request):
    # Get the path and query parameters
    path = request.url.path
    if path.startswith('/api'):
        path = path[4:]  # Remove /api prefix
    
    # Forward the request to the main FastAPI app
    return await main_app(request.scope, request.receive, request.send)

# Export the handler for Vercel
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add the handler
app.mount("/", main_app)

# For local development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 