/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['picsum.photos', 'via.placeholder.com', 'localhost', 'res.cloudinary.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL_DEV: process.env.NEXT_PUBLIC_API_URL_DEV,
    NEXT_PUBLIC_API_URL_PROD: process.env.NEXT_PUBLIC_API_URL_PROD,
  },
  rewrites: async () => {
    const isDev = process.env.NODE_ENV === "development";
    console.log("Next.js running in", isDev ? "development" : "production", "mode");
    console.log("API URL:", isDev ? process.env.NEXT_PUBLIC_API_URL_DEV : process.env.NEXT_PUBLIC_API_URL_PROD);
    
    return [
      {
        source: "/api/py/:path*",
        destination: isDev
          ? "http://127.0.0.1:8000/:path*"
          : "https://qdrant-site-template.onrender.com/:path*",
      },
      {
        source: "/docs",
        destination: isDev
          ? "http://127.0.0.1:8000/docs"
          : "https://qdrant-site-template.onrender.com/docs",
      },
      {
        source: "/openapi.json",
        destination: isDev
          ? "http://127.0.0.1:8000/openapi.json"
          : "https://qdrant-site-template.onrender.com/openapi.json",
      },
    ];
  },
};

module.exports = nextConfig;
