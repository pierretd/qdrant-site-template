'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// API base URL from environment variables
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.NEXT_PUBLIC_API_URL_PROD || ''
  : process.env.NEXT_PUBLIC_API_URL_DEV || '';

console.log('Using API base URL:', API_BASE_URL);

interface SearchResult {
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

export default function FashionSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [groups, setGroups] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);
  const [apiInfo, setApiInfo] = useState<{status: string, qdrant_url?: string, collection?: string} | null>(null);
  const [sortBy, setSortBy] = useState('relevance');
  const router = useRouter();

  const fetchResults = useCallback(async () => {
    if (useMockData) {
      const mockResults = generateMockResults();
      setResults(mockResults);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (selectedGroups.size > 0) {
        selectedGroups.forEach(group => params.append('group', group));
      }
      if (selectedItems.size > 0) {
        selectedItems.forEach(item => params.append('item', item));
      }
      params.append('offset', currentOffset.toString());
      params.append('limit', '20');
      params.append('sort', sortBy);

      const response = await fetch(`${API_BASE_URL}/api/py/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (currentOffset === 0) {
        setResults(data.results);
      } else {
        setResults(prev => [...prev, ...data.results]);
      }
      
      setHasMore(data.results.length === 20);
    } catch (error) {
      console.error('Search error:', error);
      setApiError('Failed to fetch search results');
    }
  }, [API_BASE_URL, currentOffset, query, selectedGroups, selectedItems, sortBy, useMockData]);

  const searchFashion = useCallback(async () => {
    setCurrentOffset(0);
    setHasMore(true);
    setIsLoading(true);
    setResults([]);
    setApiError(null);
    
    try {
      await fetchResults();
    } finally {
      setIsLoading(false);
    }
  }, [fetchResults]);

  const checkApiHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/py/`);
      if (response.ok) {
        const data = await response.json();
        setApiInfo(data);
      }
    } catch (error) {
      console.error('API health check failed:', error);
    }
  }, [API_BASE_URL]);

  const loadGroups = useCallback(async () => {
    try {
      console.log('Fetching groups from API...');
      const response = await fetch(`${API_BASE_URL}/api/py/groups`);
      
      if (!response.ok) {
        console.error(`Failed to load groups: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to load groups: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Groups loaded successfully:', data);
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
      // Use some default groups for development
      setGroups(['Menswear', 'Ladieswear', 'Divided', 'Baby/Children', 'Sport']);
      setApiError('Failed to load groups. Using default values.');
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    // Check API health on component mount
    checkApiHealth();
    loadGroups();
    searchFashion();
  }, [searchFashion, checkApiHealth, loadGroups]);

  const handleGroupChange = (group: string) => {
    const newGroups = new Set(selectedGroups);
    if (newGroups.has(group)) {
      newGroups.delete(group);
    } else {
      newGroups.add(group);
    }
    setSelectedGroups(newGroups);
    searchFashion();
  };

  const handleItemChange = (item: string) => {
    const newItems = new Set(selectedItems);
    if (newItems.has(item)) {
      newItems.delete(item);
    } else {
      newItems.add(item);
    }
    setSelectedItems(newItems);
    searchFashion();
  };

  const clearFilters = () => {
    setSelectedGroups(new Set());
    setSelectedItems(new Set());
    setQuery('');
    searchFashion();
  };

  const toggleMockData = () => {
    setUseMockData(!useMockData);
    searchFashion();
  };

  const navigateToDebug = () => {
    router.push('/debug');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      searchFashion();
    }
  };

  const generateMockResults = () => {
    return Array(12).fill(0).map((_, i) => ({
      image_url: `https://picsum.photos/seed/${i + 1}/300/400`,
      prod_name: `Mock Fashion Item ${i + 1}`,
      detail_desc: 'This is a sample fashion item with a detailed description. This is mock data, not from the API.',
      price: 29.99 + i,
      available: i % 3 !== 0,
      index_group_name: i % 2 === 0 ? 'Ladieswear' : 'Menswear',
      product_type_name: ['Dress', 'Jacket', 'Shirt', 'Pants', 'Shoes'][i % 5],
      color: ['Black', 'White', 'Blue', 'Red', 'Green'][i % 5],
      size: ['S', 'M', 'L', 'XL'][i % 4],
      article_id: `MOCK-${100000 + i}`
    }));
  };

  const renderFilters = () => (
    <>
      <div className="space-y-4">
        <h3 className="font-medium text-lg">Categories</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">Product Group</h4>
            <div className="space-y-2">
              {groups.map(group => (
                <div key={group} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`group-${group}`} 
                    checked={selectedGroups.has(group)}
                    onCheckedChange={() => handleGroupChange(group)}
                  />
                  <label 
                    htmlFor={`group-${group}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {group}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-sm mb-2">Item Type</h4>
            <div className="space-y-2">
              {['Dress', 'Jacket', 'Sneakers', 'Gloves', 'Shirt', 'Sweater'].map(item => (
                <div key={item} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`item-${item}`} 
                    checked={selectedItems.has(item)}
                    onCheckedChange={() => handleItemChange(item)}
                  />
                  <label 
                    htmlFor={`item-${item}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {item}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <Button 
        variant="outline" 
        className="w-full"
        onClick={clearFilters}
      >
        Clear Filters
      </Button>
    </>
  );

  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === 'relevance') {
      return 0;
    } else if (sortBy === 'price_asc') {
      return a.price - b.price;
    } else if (sortBy === 'price_desc') {
      return b.price - a.price;
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 dark:bg-gray-800/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-800/60">
        <div className="container flex h-16 items-center">
          <div className="mr-4 flex">
            <a href="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl text-gray-900 dark:text-white">H&M Fashion Search</span>
            </a>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-2">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">
                GitHub
              </a>
              <a href="https://qdrant.tech" target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">
                Qdrant
              </a>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleMockData}
                className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {useMockData ? "Use API Data" : "Use Mock Data"}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={navigateToDebug}
                className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Debug
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <div className="container py-6 md:py-8 lg:py-10">
        {/* API Info Banner */}
        {apiInfo && apiInfo.status !== 'ok' && (
          <div className="mb-6 px-4 py-3 rounded border bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
            <p className="font-medium">API Status: {apiInfo.status}</p>
            <p className="text-sm">There may be issues with the API connection. See the <Button variant="link" className="p-0 h-auto text-amber-700 dark:text-amber-400 underline" onClick={navigateToDebug}>debug page</Button> for more information.</p>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-8">
          <div className="flex">
            <div className="relative flex-grow">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              <Input
                type="search"
                placeholder="Search for fashion items..."
                className="pl-10 pr-4 py-6 text-base w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyPress}
              />
            </div>
            <Button 
              className="ml-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white" 
              onClick={searchFashion}
              disabled={isLoading}
            >
              Search
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="ml-2 lg:hidden border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {apiError && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6 flex justify-between items-center">
            <div>
              <p className="font-medium">API Error</p>
              <p className="text-sm">{apiError}</p>
            </div>
            <Button variant="outline" size="sm" className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50" onClick={() => setApiError(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Mobile filters drawer */}
        {showMobileFilters && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div 
              className="absolute inset-0 bg-black/30 backdrop-blur-sm" 
              onClick={() => setShowMobileFilters(false)}
            />
            <div className="absolute right-0 top-0 h-full w-full max-w-xs border-l bg-white dark:bg-gray-800 shadow-lg">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Filters</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowMobileFilters(false)}>
                  <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </Button>
              </div>
              <div className="p-4">
                {renderFilters()}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar filters for desktop */}
          <div className="hidden lg:block w-full max-w-xs space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white text-lg mb-4">Filters</h2>
              {renderFilters()}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-12 w-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                <p className="mt-4 text-gray-600 dark:text-gray-300 text-sm">Searching for fashion items...</p>
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-300">{results.length} results</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mr-2">Sort by:</p>
                    <Select 
                      value={sortBy} 
                      onValueChange={setSortBy}
                    >
                      <SelectTrigger className="w-[180px] text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800">
                        <SelectItem value="relevance" className="text-sm">Relevance</SelectItem>
                        <SelectItem value="price_asc" className="text-sm">Price: Low to High</SelectItem>
                        <SelectItem value="price_desc" className="text-sm">Price: High to Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {sortedResults.map((item, index) => (
                    <div key={item.article_id || `item-${index}`} className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow duration-300">
                      <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
                        <Image 
                          src={item.image_url} 
                          alt={item.prod_name} 
                          fill
                          className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/300x400?text=Image+Not+Available';
                          }}
                          unoptimized={true}
                        />
                      </div>
                      <div className="p-4">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full mb-2">
                          {item.product_type_name}
                        </span>
                        <h3 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-1">{item.prod_name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">{item.detail_desc}</p>
                        <p className="text-indigo-700 dark:text-indigo-400 font-semibold">${item.price?.toFixed(2) || '29.99'}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {hasMore && !useMockData && (
                  <div className="flex justify-center mt-8">
                    <Button 
                      variant="outline" 
                      className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                      onClick={fetchResults}
                      disabled={isLoading}
                    >
                      Load More
                    </Button>
                  </div>
                )}
                
                {useMockData && (
                  <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-4 py-3 rounded mt-6">
                    <p className="font-medium">Using Mock Data</p>
                    <p className="text-sm">Currently displaying mock data instead of API results.</p>
                  </div>
                )}
              </>
            ) : query ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-gray-600 dark:text-gray-300 mb-2">No results found for &quot;{query}&quot;</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Try a different search term or adjust your filters</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-gray-600 dark:text-gray-300 mb-2">Enter a search term to find fashion items</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Try searching for categories like &quot;dress&quot;, &quot;jeans&quot;, or &quot;shirt&quot;</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 