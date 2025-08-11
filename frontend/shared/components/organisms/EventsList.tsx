import React from 'react';
import { Event } from '../../types';
import { EventCard } from '../molecules';
import { Button } from '../atoms';

export interface EventsListProps {
  events: Event[];
  loading?: boolean;
  error?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRegister?: (eventId: number) => void;
  onViewDetails?: (eventId: number) => void;
  registrationLoading?: { [eventId: number]: boolean };
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateAction?: React.ReactNode;
  gridLayout?: boolean;
  compact?: boolean;
  className?: string;
  testId?: string;
}

export const EventsList: React.FC<EventsListProps> = ({
  events,
  loading = false,
  error,
  hasMore = false,
  onLoadMore,
  onRegister,
  onViewDetails,
  registrationLoading = {},
  emptyStateTitle = 'No events found',
  emptyStateDescription = 'Try adjusting your search criteria or check back later.',
  emptyStateAction,
  gridLayout = true,
  compact = false,
  className = '',
  testId
}) => {
  const renderLoadingState = () => {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="flex justify-between items-start mb-4">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-6 bg-gray-200 rounded-full w-20"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-10 bg-gray-200 rounded flex-1"></div>
              <div className="h-10 bg-gray-200 rounded flex-1"></div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderErrorState = () => {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-red-400 mb-4">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  };
  
  const renderEmptyState = () => {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyStateTitle}</h3>
        <p className="text-gray-500 mb-4">{emptyStateDescription}</p>
        {emptyStateAction && emptyStateAction}
      </div>
    );
  };
  
  const renderEventsList = () => {
    const gridClasses = gridLayout
      ? 'grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      : 'space-y-6';
      
    return (
      <div className={gridClasses}>
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onRegister={onRegister}
            onViewDetails={onViewDetails}
            registrationLoading={registrationLoading[event.id] || false}
            compact={compact}
            testId={`${testId}-event-${event.id}`}
          />
        ))}
      </div>
    );
  };
  
  if (loading && events.length === 0) {
    return (
      <div className={className} data-testid={testId}>
        {renderLoadingState()}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={className} data-testid={testId}>
        {renderErrorState()}
      </div>
    );
  }
  
  if (events.length === 0) {
    return (
      <div className={className} data-testid={testId}>
        {renderEmptyState()}
      </div>
    );
  }
  
  return (
    <div className={className} data-testid={testId}>
      {renderEventsList()}
      
      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            onClick={onLoadMore}
            loading={loading}
            disabled={loading}
            testId={`${testId}-load-more`}
          >
            {loading ? 'Loading...' : 'Load More Events'}
          </Button>
        </div>
      )}
    </div>
  );
};