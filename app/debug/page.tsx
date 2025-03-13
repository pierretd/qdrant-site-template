'use client';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function DebugPage() {
  const [apiInfo, setApiInfo] = useState<{status: string, qdrant_url?: string, collection?: string} | null>(null);
  
  // API base URL from environment variables
  const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_API_URL_PROD || ''
    : process.env.NEXT_PUBLIC_API_URL_DEV || '';

  useEffect(() => {
    // Check API health on component mount
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/py/`);
      if (response.ok) {
        const data = await response.json();
        setApiInfo(data);
        console.log('API health check:', data);
      }
    } catch (error) {
      console.error('API health check failed:', error);
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Debug Information</h1>
        <Link href="/">
          <Button variant="outline">Back to Search</Button>
        </Link>
      </div>

      <div className="space-y-6">
        <div className="p-6 rounded-lg border bg-slate-50">
          <h2 className="text-xl font-semibold mb-4">API Configuration</h2>
          <div className="space-y-2">
            <p><span className="font-medium">API Base URL:</span> {API_BASE_URL}</p>
            <p><span className="font-medium">Environment:</span> {process.env.NODE_ENV}</p>
            <p><span className="font-medium">NEXT_PUBLIC_API_URL_DEV:</span> {process.env.NEXT_PUBLIC_API_URL_DEV}</p>
            <p><span className="font-medium">NEXT_PUBLIC_API_URL_PROD:</span> {process.env.NEXT_PUBLIC_API_URL_PROD}</p>
          </div>
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkApiHealth}
              className="mr-2"
            >
              Check API Health
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open(`${API_BASE_URL}/api/py/`, '_blank')}
            >
              Open API Root
            </Button>
          </div>
        </div>

        {apiInfo && (
          <div className={`p-6 rounded-lg border ${apiInfo.status === 'ok' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <h2 className="text-xl font-semibold mb-4">API Status</h2>
            <p><span className="font-medium">Status:</span> {apiInfo.status}</p>
            {apiInfo.qdrant_url && (
              <p><span className="font-medium">Qdrant URL:</span> {apiInfo.qdrant_url}</p>
            )}
            {apiInfo.collection && (
              <p><span className="font-medium">Collection:</span> {apiInfo.collection}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 