'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import FeaturedProducts from './components/FeaturedProducts';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// API base URL from environment variables
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.NEXT_PUBLIC_API_URL_PROD || ''
  : process.env.NEXT_PUBLIC_API_URL_DEV || '';

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const [groups, setGroups] = useState<string[]>(["Menswear", "Ladieswear", "Divided", "Baby/Children", "Sport"]);
  const [sortBy, setSortBy] = useState('relevance');
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Load product groups on component mount
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/py/groups`);
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      // Already using default groups from state initialization
    }
  };
  
  const handleGroupChange = (group: string) => {
    const newGroups = new Set(selectedGroups);
    if (newGroups.has(group)) {
      newGroups.delete(group);
    } else {
      newGroups.add(group);
    }
    setSelectedGroups(newGroups);
  };

  const handleItemChange = (item: string) => {
    const newItems = new Set(selectedItems);
    if (newItems.has(item)) {
      newItems.delete(item);
    } else {
      newItems.add(item);
    }
    setSelectedItems(newItems);
  };

  const clearFilters = () => {
    setSelectedGroups(new Set());
    setSelectedItems(new Set());
    setQuery('');
    setShowResults(false);
  };

  const searchFashion = async () => {
    if (!query.trim() && selectedGroups.size === 0 && selectedItems.size === 0) {
      setShowResults(false);
      return;
    }
    
    setIsLoading(true);
    setResults([]);
    setApiError(null);
    
    try {
      const searchParams = new URLSearchParams();
      if (query) searchParams.append('query', query);
      
      selectedGroups.forEach(group => {
        searchParams.append('group', group);
      });
      
      selectedItems.forEach(item => {
        searchParams.append('item', item);
      });
      
      searchParams.append('limit', '20');
      searchParams.append('offset', '0');
      
      const apiUrl = `${API_BASE_URL}/api/py/search?${searchParams}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('API returned invalid data format');
      }
      
      setResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Error fetching results:', error);
      setApiError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Generate mock results for demo purposes
      setResults(generateMockResults());
      setShowResults(true);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockResults = () => {
    return Array(12).fill(0).map((_, i) => ({
      image_url: `/images/featured/0790${i + 100}001.jpg`,
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      searchFashion();
    }
  };

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
    <div className="bg-white dark:bg-gray-950 min-h-screen">
      {/* Hero Section with Search Bar - Dark theme */}
      <div className="relative bg-gray-900 text-white">
        <div className="absolute inset-0 overflow-hidden">
          <Image 
            src="/images/hero-fashion.jpg" 
            alt="Fashion Banner"
            fill
            quality={90}
            priority={true}
            className="object-cover opacity-40"
          />
        </div>
        <div className="relative container py-16 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white">Discover Your Style</h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl text-gray-200">Explore our latest collections with powerful search.</p>
          
          {/* Search Bar */}
          <div className="w-full max-w-3xl mx-auto">
            <div className="relative flex">
              <div className="relative flex-grow">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Search for fashion items..."
                  className="pl-10 pr-4 py-6 text-lg w-full bg-white/90 dark:bg-gray-800/90 border-gray-300 dark:border-gray-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                />
              </div>
              <Button 
                className="ml-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-lg py-6" 
                onClick={searchFashion}
                disabled={isLoading}
                type="submit"
              >
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="container py-8">
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
        
        {showResults ? (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar filters - now on the left */}
            <div className="w-full lg:w-64 shrink-0">
              <div className="sticky top-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="font-semibold text-gray-900 dark:text-white text-lg mb-4">Filters</h2>
                
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-800 dark:text-gray-200">Categories</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Product Group</h4>
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
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 dark:text-gray-300"
                            >
                              {group}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Item Type</h4>
                      <div className="space-y-2">
                        {['Dress', 'Jacket', 'Sneakers', 'Shirt', 'Pants'].map(item => (
                          <div key={item} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`item-${item}`} 
                              checked={selectedItems.has(item)}
                              onCheckedChange={() => handleItemChange(item)}
                            />
                            <label 
                              htmlFor={`item-${item}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 dark:text-gray-300"
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
                  className="w-full mt-6 border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
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
                      <Card key={item.article_id || `item-${index}`} className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow duration-300">
                        <div className="aspect-[3/4] relative overflow-hidden bg-gray-100 dark:bg-gray-900">
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
                        <CardContent className="p-4">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full mb-2">
                            {item.product_type_name}
                          </span>
                          <h3 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-1">{item.prod_name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">{item.detail_desc}</p>
                          <p className="text-indigo-700 dark:text-indigo-400 font-semibold">${item.price?.toFixed(2) || '29.99'}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-gray-600 dark:text-gray-300 mb-2">No results found for "{query}"</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Try a different search term or adjust your filters</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Featured Products when not searching */
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar filters - consistent with search view */}
            <div className="w-full lg:w-64 shrink-0">
              <div className="sticky top-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="font-semibold text-gray-900 dark:text-white text-lg mb-4">Filters</h2>
                
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-800 dark:text-gray-200">Categories</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Product Group</h4>
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
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 dark:text-gray-300"
                            >
                              {group}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Item Type</h4>
                      <div className="space-y-2">
                        {['Dress', 'Jacket', 'Sneakers', 'Shirt', 'Pants'].map(item => (
                          <div key={item} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`item-${item}`} 
                              checked={selectedItems.has(item)}
                              onCheckedChange={() => handleItemChange(item)}
                            />
                            <label 
                              htmlFor={`item-${item}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 dark:text-gray-300"
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
                  type="submit"
                  className="w-full mt-6 border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                  onClick={searchFashion}
                >
                  Apply Filters
                </Button>
              </div>
            </div>
            
            {/* Featured Products */}
            <div className="flex-1">
              <FeaturedProducts limit={4} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
