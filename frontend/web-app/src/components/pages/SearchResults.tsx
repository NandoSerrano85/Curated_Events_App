'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { EventCard } from '../../shared/components/molecules/EventCard';
import { SearchBar } from '../../shared/components/molecules/SearchBar';
import { LoadingSpinner } from '../../shared/components/atoms/LoadingSpinner';
import { Button } from '../../shared/components/atoms/Button';
import { useSearchEvents } from '../../shared/hooks/useEvents';
import { EventCategory, EventStatus, SortOption } from '../../shared/types';

interface SearchFilters {
  category: EventCategory | 'all';
  priceRange: [number, number];
  dateRange: 'all' | 'today' | 'week' | 'month';
  location: string;
  status: EventStatus | 'all';
}

export const SearchResults: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const initialQuery = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>({
    category: (searchParams.get('category') as EventCategory) || 'all',
    priceRange: [0, 1000],
    dateRange: 'all',
    location: searchParams.get('location') || '',
    status: 'all'
  });

  const [sort, setSort] = useState<{field: SortOption, order: 'asc' | 'desc'}>({
    field: 'date',
    order: 'asc'
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Build search query parameters
  const searchParameters = useMemo(() => {
    const params: any = {
      text: searchQuery,
      page: currentPage,
      limit: 12,
      sort: sort.field,
      order: sort.order
    };

    if (filters.category !== 'all') params.category = filters.category;
    if (filters.location) params.location = filters.location;
    if (filters.status !== 'all') params.status = filters.status;
    if (filters.priceRange[0] > 0) params.price_min = filters.priceRange[0];
    if (filters.priceRange[1] < 1000) params.price_max = filters.priceRange[1];

    // Date filtering
    if (filters.dateRange !== 'all') {
      const now = new Date();
      switch (filters.dateRange) {
        case 'today':
          params.date_from = now.toISOString().split('T')[0];
          params.date_to = now.toISOString().split('T')[0];
          break;
        case 'week':
          const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          params.date_from = now.toISOString().split('T')[0];
          params.date_to = weekLater.toISOString().split('T')[0];
          break;
        case 'month':
          const monthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          params.date_from = now.toISOString().split('T')[0];
          params.date_to = monthLater.toISOString().split('T')[0];
          break;
      }
    }

    return params;
  }, [searchQuery, filters, sort, currentPage]);

  const { 
    data: searchResponse, 
    isLoading, 
    isError, 
    error 
  } = useSearchEvents(searchParameters, !!searchQuery);

  const events = searchResponse?.events || [];
  const pagination = searchResponse?.pagination;
  const facets = searchResponse?.facets;
  const totalResults = searchResponse?.total || 0;

  // Update URL when search parameters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (filters.category !== 'all') params.set('category', filters.category);
    if (filters.location) params.set('location', filters.location);
    
    const newUrl = `/search?${params.toString()}`;
    router.replace(newUrl);
  }, [searchQuery, filters, router]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleSortChange = (field: SortOption, order: 'asc' | 'desc') => {
    setSort({ field, order });
    setCurrentPage(1);
  };

  const handleRegister = (eventId: number) => {
    console.log(`Register for event ${eventId}`);
  };

  const handleViewDetails = (eventId: number) => {
    window.location.href = `/events/${eventId}`;
  };

  const resetFilters = () => {
    setFilters({
      category: 'all',
      priceRange: [0, 1000],
      dateRange: 'all',
      location: '',
      status: 'all'
    });
    setSort({ field: 'date', order: 'asc' });
    setCurrentPage(1);
  };

  const categories = Object.values(EventCategory);

  const getSearchSuggestions = () => {
    if (!facets) return [];
    
    return [
      ...facets.popularCategories?.slice(0, 3) || [],
      ...facets.popularLocations?.slice(0, 2) || [],
      ...facets.trending?.slice(0, 2) || []
    ];
  };

  if (!searchQuery) {
    return (
      <div className="min-h-screen pt-24 bg-gradient-to-b from-neutral-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <div className="text-6xl mb-6">🔍</div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-4">
              Search Events
            </h1>
            <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
              Find exactly what you're looking for. Search by event name, location, category, or keywords.
            </p>
            
            <div className="max-w-2xl mx-auto mb-12">
              <SearchBar
                placeholder="Search events, locations, or organizers..."
                onSearch={handleSearch}
                className="w-full"
                autoFocus
              />
            </div>

            {/* Popular Searches */}
            <div className="text-left max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Popular Searches
              </h3>
              <div className="space-y-2">
                {['Tech conferences', 'Business workshops', 'Art exhibitions', 'Music festivals', 'Food events'].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(suggestion)}
                    className="block w-full text-left px-4 py-2 rounded-lg text-neutral-600 hover:bg-neutral-50 hover:text-primary-600 transition-colors duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">
              Search Error
            </h2>
            <p className="text-neutral-600 mb-8">
              {error?.message || 'Failed to search events'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 bg-gradient-to-b from-neutral-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Header */}
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              Search Results
            </h1>
            <p className="text-neutral-600">
              {isLoading ? 'Searching...' : `${totalResults} results for "${searchQuery}"`}
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mb-6">
            <SearchBar
              placeholder="Search events, locations, or organizers..."
              onSearch={handleSearch}
              defaultValue={searchQuery}
              className="w-full"
            />
          </div>

          {/* Search Suggestions */}
          {getSearchSuggestions().length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-neutral-600 mb-2">Related searches:</p>
              <div className="flex flex-wrap gap-2">
                {getSearchSuggestions().map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(suggestion)}
                    className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm hover:bg-primary-100 transition-colors duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-80 flex-shrink-0">
            <div className="glass rounded-2xl p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-neutral-900">
                  Refine Search
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-sm"
                >
                  Reset
                </Button>
              </div>

              <div className="space-y-6">
                {/* Category Facets */}
                {facets?.categories && facets.categories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-3">
                      Categories
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="category"
                          value="all"
                          checked={filters.category === 'all'}
                          onChange={(e) => handleFilterChange('category', e.target.value)}
                          className="text-primary-500"
                        />
                        <span className="text-sm text-neutral-700">All Categories</span>
                      </label>
                      {facets.categories.map((category: any) => (
                        <label key={category.name} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="category"
                              value={category.name}
                              checked={filters.category === category.name}
                              onChange={(e) => handleFilterChange('category', e.target.value)}
                              className="text-primary-500"
                            />
                            <span className="text-sm text-neutral-700">
                              {category.name.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </span>
                          </div>
                          <span className="text-xs text-neutral-500">({category.count})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location Filter */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="City, State or Online"
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="input-field w-full"
                  />
                  {facets?.locations && facets.locations.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {facets.locations.slice(0, 5).map((location: any) => (
                        <button
                          key={location.name}
                          onClick={() => handleFilterChange('location', location.name)}
                          className="block w-full text-left text-sm text-primary-600 hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50"
                        >
                          {location.name} ({location.count})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">
                    Date Range
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'all', label: 'Any Time' },
                      { value: 'today', label: 'Today' },
                      { value: 'week', label: 'This Week' },
                      { value: 'month', label: 'This Month' }
                    ].map(option => (
                      <label key={option.value} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="dateRange"
                          value={option.value}
                          checked={filters.dateRange === option.value}
                          onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                          className="text-primary-500"
                        />
                        <span className="text-sm text-neutral-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">
                    Price Range
                  </label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={filters.priceRange[1]}
                      onChange={(e) => handleFilterChange('priceRange', [0, parseInt(e.target.value)])}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-neutral-600">
                      <span>Free</span>
                      <span>${filters.priceRange[1]}+</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="mb-4 sm:mb-0">
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-neutral-600">Searching...</span>
                  </div>
                ) : (
                  <p className="text-neutral-600">
                    Showing {events.length} of {totalResults} results
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-4">
                {/* Sort Options */}
                <select
                  value={`${sort.field}-${sort.order}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-') as [SortOption, 'asc' | 'desc'];
                    handleSortChange(field, order);
                  }}
                  className="input-field text-sm"
                >
                  <option value="relevance-desc">Most Relevant</option>
                  <option value="date-asc">Date (Earliest First)</option>
                  <option value="date-desc">Date (Latest First)</option>
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="popularity-desc">Most Popular</option>
                  <option value="created_at-desc">Recently Added</option>
                </select>

                {/* View Mode Toggle */}
                <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 text-sm ${viewMode === 'grid' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'bg-white text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 text-sm ${viewMode === 'list' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'bg-white text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 16a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Search Results */}
            {isLoading ? (
              <div className="flex justify-center py-16">
                <LoadingSpinner />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-neutral-400 text-6xl mb-4">😔</div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  No events found
                </h3>
                <p className="text-neutral-600 mb-6">
                  We couldn't find any events matching your search. Try different keywords or adjust your filters.
                </p>
                <div className="space-y-3">
                  <Button onClick={resetFilters}>
                    Reset Filters
                  </Button>
                  <div>
                    <Link href="/events" className="text-primary-600 hover:text-primary-700">
                      Browse all events →
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className={`
                  ${viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 gap-6' 
                    : 'space-y-4'
                  }
                `}>
                  {events.map((event: any, index: number) => (
                    <div 
                      key={event.id} 
                      className="animate-slide-up" 
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <EventCard
                        event={event}
                        onRegister={handleRegister}
                        onViewDetails={handleViewDetails}
                        showRegisterButton={true}
                        showViewDetailsButton={true}
                        compact={viewMode === 'list'}
                        className={`h-full hover:scale-105 transition-transform duration-300 ${
                          viewMode === 'list' ? 'flex-row' : ''
                        }`}
                        testId={`search-result-${event.id}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.total_pages > 1 && (
                  <div className="flex justify-center mt-12">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        disabled={!pagination.has_prev}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      >
                        Previous
                      </Button>
                      
                      {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                        const page = i + Math.max(1, currentPage - 2);
                        if (page > pagination.total_pages) return null;
                        
                        return (
                          <Button
                            key={page}
                            variant={page === currentPage ? "primary" : "ghost"}
                            onClick={() => setCurrentPage(page)}
                            className="w-10 h-10"
                          >
                            {page}
                          </Button>
                        );
                      })}
                      
                      <Button
                        variant="ghost"
                        disabled={!pagination.has_next}
                        onClick={() => setCurrentPage(prev => Math.min(pagination.total_pages, prev + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};