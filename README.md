# H&M Fashion Search

A semantic search application for H&M fashion items using Qdrant vector database and Next.js.

## Features

- Semantic search for fashion items
- Filter by product groups and item types
- Responsive design with Shadcn UI components
- Integration with Qdrant Cloud for vector search

## Setup

### Prerequisites

- Node.js 16+
- Python 3.8+
- Qdrant Cloud account with a collection named "h&m-mini"

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Qdrant Configuration
QDRANT_URL=your-qdrant-cloud-url
QDRANT_API_KEY=your-qdrant-api-key
QDRANT_COLLECTION=h&m-mini

# Next.js Configuration
NEXT_PUBLIC_API_URL_DEV=http://localhost:8000
NEXT_PUBLIC_API_URL_PROD=https://your-production-url.com

# FastAPI Configuration
CORS_ORIGINS=https://your-production-url.com,http://localhost:3000
```

### Installation

1. Install Node.js dependencies:

```bash
npm install
```

2. Install Python dependencies:

```bash
pip install -r requirements.txt
```

### Verify Qdrant Connection

Run the following script to verify your Qdrant Cloud connection:

```bash
python api/check_qdrant.py
```

### Development

1. Start the FastAPI backend:

```bash
cd api
uvicorn main:app --reload
```

2. In a separate terminal, start the Next.js frontend:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deployment

#### Backend (FastAPI)

1. Deploy the FastAPI backend to a service like Render, Heroku, or AWS:

```bash
# Example for Render
render deploy
```

2. Set the environment variables in your deployment platform.

#### Frontend (Next.js)

1. Build the Next.js application:

```bash
npm run build
```

2. Deploy the built application to a service like Vercel or Netlify:

```bash
# Example for Vercel
vercel --prod
```

3. Set the environment variables in your deployment platform.

## Architecture

- **Frontend**: Next.js with Shadcn UI components
- **Backend**: FastAPI with sentence-transformers
- **Vector Database**: Qdrant Cloud
- **Embedding Model**: CLIP-ViT-B-32

## License

MIT

# Performance Optimizations

## Static Featured Products Data

To improve the initial load time and prevent page content jumps, the homepage featured products are pre-loaded from a static JSON file instead of being fetched from the API during page load. This provides several benefits:

1. **Faster Initial Load**: No waiting for API responses when first loading the page
2. **No Content Jumps**: Page content is immediately available, preventing layout shifts
3. **Reduced API Traffic**: Fewer API calls for frequently viewed content
4. **Better SEO**: Content is immediately available for search engine crawlers

### How It Works

1. Featured products data is stored in `app/data/localFeaturedProducts.json`
2. Images are stored locally in `public/images/featured/`
3. The `FeaturedProducts` component loads this data directly without API calls
4. The search functionality still uses API calls for real-time results

### Refreshing Static Data

To update the static data with the latest products from the API:

```bash
# Make sure the API is running
npm run fastapi-dev

# In another terminal, run the refresh script
npm run refresh-static
```

This will:
1. Fetch the latest featured products from the API
2. Download all product images locally
3. Update the JSON files with the latest data
4. Map remote image URLs to local paths

The refresh script is located at `scripts/refresh-static-data.js`.
