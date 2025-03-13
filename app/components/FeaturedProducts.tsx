'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import localFeaturedProducts from '@/app/data/localFeaturedProducts.json';

// API base URL from environment variables - only used for non-featured product API calls
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.NEXT_PUBLIC_API_URL_PROD || ''
  : process.env.NEXT_PUBLIC_API_URL_DEV || '';

interface Product {
  image_url: string;
  prod_name: string;
  detail_desc: string;
  price: number;
  available: boolean;
  index_group_name: string;
  product_type_name: string;
  color: string;
  size: string;
  article_id: string;
}

interface FeaturedProductsProps {
  limit?: number;
}

export default function FeaturedProducts({ limit = 4 }: FeaturedProductsProps) {
  // Pre-loaded featured products
  const [featuredProducts, setFeaturedProducts] = useState<Record<string, Product[]>>(localFeaturedProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Order categories according to Config.GROUP_ORDER
  const orderedCategories = Object.keys(featuredProducts).sort((a, b) => {
    const ORDER = ["Menswear", "Ladieswear", "Divided", "Baby/Children", "Sport"];
    const aIndex = ORDER.indexOf(a);
    const bIndex = ORDER.indexOf(b);
    
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // No loading state needed as data is already available
  if (error) {
    return (
      <div className="py-6">
        <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Featured Collections</h2>
      
      {orderedCategories.map(category => (
        <div key={category} className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{category}</h3>
            <Button 
              variant="outline" 
              size="sm"
              className="border-indigo-500 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
              onClick={() => {
                const params = new URLSearchParams();
                params.append('group', category);
                document.querySelector('input[type="search"]')?.setAttribute('value', '');
                const searchEvent = new Event('input', { bubbles: true });
                document.querySelector('input[type="search"]')?.dispatchEvent(searchEvent);
                const buttonEvent = new MouseEvent('click', { bubbles: true });
                document.querySelector('button[type="submit"]')?.dispatchEvent(buttonEvent);
              }}
            >
              View All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featuredProducts[category]?.slice(0, limit).map((product, index) => (
              <Card key={`${product.article_id || index}`} className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow duration-300">
                <div className="aspect-[3/4] relative overflow-hidden bg-gray-100 dark:bg-gray-900">
                  <Image
                    src={product.image_url}
                    alt={product.prod_name}
                    fill
                    className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    priority={index < 4} // This ensures the first few images load with high priority
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/300x400?text=Image+Not+Available';
                    }}
                  />
                </div>
                <CardContent className="p-4">
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full mb-2">
                    {product.product_type_name}
                  </span>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-1">{product.prod_name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">{product.detail_desc}</p>
                  <p className="text-indigo-700 dark:text-indigo-400 font-semibold">${product.price?.toFixed(2) || '29.99'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
} 