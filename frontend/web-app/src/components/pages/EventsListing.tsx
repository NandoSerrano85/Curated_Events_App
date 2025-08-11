'use client';

import React, { useState, useMemo } from 'react';
import { EventCard } from '../../shared/components/molecules/EventCard';
import { SearchBar } from '../../shared/components/molecules/SearchBar';
import { LoadingSpinner } from '../../shared/components/atoms/LoadingSpinner';
import { Button } from '../../shared/components/atoms/Button';
import { useEvents } from '../../shared/hooks/useEvents';
import { Event, EventCategory, EventStatus, SortOption } from '../../shared/types';

interface FilterState {
  search: string;
  category: EventCategory | 'all';
  priceRange: [number, number];
  dateRange: 'all' | 'today' | 'week' | 'month';
  location: string;
  status: EventStatus | 'all';
}

interface SortState {
  field: SortOption;
  order: 'asc' | 'desc';
}

export const EventsListing: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'all',
    priceRange: [0, 1000],
    dateRange: 'all',
    location: '',
    status: 'all'
  });

  const [sort, setSort] = useState<SortState>({
    field: 'date',
    order: 'asc'
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Build query parameters for the API
  const queryParams = useMemo(() => {
    const params: Record<string, any> = {
      page: currentPage,
      limit: 12,
      sort: sort.field,
      order: sort.order
    };

    if (filters.search) params.search = filters.search;
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
  }, [filters, sort, currentPage]);

  const { 
    data: eventsResponse, 
    isLoading, 
    isError, 
    error 
  } = useEvents(queryParams);

  const events = eventsResponse?.data?.items || [];
  const pagination = eventsResponse?.data?.pagination;

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query }));
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleSortChange = (field: SortOption, order: 'asc' | 'desc') => {
    setSort({ field, order });
    setCurrentPage(1);
  };

  const handleRegister = (eventId: number) => {
    console.log(`Register for event ${eventId}`);
    // This will be implemented with the registration API
  };

  const handleViewDetails = (eventId: number) => {
    window.location.href = `/events/${eventId}`;
  };

  const resetFilters = () => {
    setFilters({
      search: '',
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

  if (isError) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">
              Something went wrong
            </h2>
            <p className="text-neutral-600 mb-8">
              {error?.message || 'Failed to load events'}
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
    <div className="min-h-screen pt-24 gradient-bg-pastel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-12">
          <div className="text-center mb-12 animate-slide-up">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-pastel-mint to-pastel-blue border border-primary-200/50 mb-6">
              <span className="w-2 h-2 bg-accent-400 rounded-full mr-2 animate-pulse"></span>
              <span className="text-sm font-medium text-primary-700">
                Browse Events
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
              <span className="gradient-text">Discover</span> Amazing Events
            </h1>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto leading-relaxed">
              Find events that match your interests, connect with like-minded people, and create memorable experiences.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <SearchBar
              placeholder="Search events, locations, or organizers..."
              onSearch={handleSearch}
              defaultValue={filters.search}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-80 flex-shrink-0">
            <div className="card-pastel p-6 sticky top-24 border border-pastel-purple border-opacity-20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
                  <div className="w-5 h-5 mr-2 text-primary-500">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 2v-6.586a1 1 0 00-.293-.707L3.293 5.707A1 1 0 013 5V4z" />
                    </svg>
                  </div>
                  Filters
                </h3>
                <Button
                  variant="pastel"
                  size="sm"
                  onClick={resetFilters}
                  className="text-xs"
                >
                  Reset All
                </Button>
              </div>

              <div className="space-y-6">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
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
                    <span className="text-neutral-600">Loading events...</span>
                  </div>
                ) : (
                  <p className="text-neutral-600">
                    {pagination?.total || 0} events found
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
                  <option value="date-asc">Date (Earliest First)</option>
                  <option value="date-desc">Date (Latest First)</option>
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="title-desc">Title (Z-A)</option>
                  <option value="created_at-desc">Recently Added</option>
                  <option value="popularity-desc">Most Popular</option>
                </select>

                {/* View Mode Toggle */}
                <div className="flex rounded-xl border border-pastel-purple border-opacity-30 bg-white/60 backdrop-blur-sm overflow-hidden shadow-soft">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-3 text-sm transition-all duration-200 ${viewMode === 'grid' 
                      ? 'bg-gradient-to-r from-pastel-blue to-pastel-lavender text-primary-700 shadow-soft' 
                      : 'bg-transparent text-neutral-600 hover:bg-white/80'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-3 text-sm transition-all duration-200 ${viewMode === 'list' 
                      ? 'bg-gradient-to-r from-pastel-blue to-pastel-lavender text-primary-700 shadow-soft' 
                      : 'bg-transparent text-neutral-600 hover:bg-white/80'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 16a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Events Grid/List */}
            {isLoading ? (
              <div className="flex justify-center py-16">
                <LoadingSpinner />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-neutral-400 text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  No events found
                </h3>
                <p className="text-neutral-600 mb-6">
                  Try adjusting your filters or search terms.
                </p>
                <Button onClick={resetFilters}>
                  Reset Filters
                </Button>
              </div>
            ) : (
              <>
                <div className={`
                  ${viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 gap-6' 
                    : 'space-y-4'
                  }
                `}>
                  {events.map((event: Event, index: number) => (
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
                        testId={`event-${event.id}`}
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