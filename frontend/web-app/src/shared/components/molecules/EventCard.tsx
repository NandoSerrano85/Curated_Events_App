import React from 'react';
import { Event, EventCategory } from '../../types';
import { Button } from '../atoms';

export interface EventCardProps {
  event: Event;
  onRegister?: (eventId: number) => void;
  onViewDetails?: (eventId: number) => void;
  registrationLoading?: boolean;
  showRegisterButton?: boolean;
  showViewDetailsButton?: boolean;
  compact?: boolean;
  className?: string;
  testId?: string;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onRegister,
  onViewDetails,
  registrationLoading = false,
  showRegisterButton = true,
  showViewDetailsButton = true,
  compact = false,
  className = '',
  testId
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getCategoryColor = (category: EventCategory) => {
    const colors = {
      [EventCategory.TECHNOLOGY]: 'bg-pastel-blue text-primary-800 border border-primary-200',
      [EventCategory.BUSINESS]: 'bg-pastel-mint text-accent-800 border border-accent-200',
      [EventCategory.ARTS]: 'bg-pastel-lavender text-secondary-800 border border-secondary-200',
      [EventCategory.SPORTS]: 'bg-pastel-orange text-orange-800 border border-orange-200',
      [EventCategory.MUSIC]: 'bg-pastel-pink text-secondary-800 border border-secondary-200',
      [EventCategory.FOOD]: 'bg-pastel-yellow text-yellow-800 border border-yellow-200',
      [EventCategory.EDUCATION]: 'bg-pastel-purple text-primary-800 border border-primary-200',
      [EventCategory.HEALTH]: 'bg-pastel-emerald text-accent-800 border border-accent-200',
      [EventCategory.TRAVEL]: 'bg-pastel-sky text-primary-800 border border-primary-200',
      [EventCategory.OTHER]: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors[EventCategory.OTHER];
  };
  
  const isFullyBooked = event.currentRegistrations >= event.capacity;
  const availableSpots = event.capacity - event.currentRegistrations;
  
  return (
    <div
      className={`card-pastel hover:shadow-large transition-all duration-300 overflow-hidden group hover:scale-102 ${className}`}
      data-testid={testId}
    >
      {event.imageUrl && (
        <div className={`relative ${compact ? 'h-32' : 'h-48'}`}>
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(event.category)}`}>
              {event.category}
            </span>
          </div>
        </div>
      )}
      
      <div className={compact ? 'p-4' : 'p-6'}>
        {!event.imageUrl && (
          <div className="flex justify-between items-start mb-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(event.category)}`}>
              {event.category}
            </span>
          </div>
        )}
        
        <h3 className={`font-bold text-neutral-900 mb-2 group-hover:text-primary-700 transition-colors duration-200 ${compact ? 'text-lg' : 'text-xl'}`}>
          {event.title}
        </h3>
        
        <p className={`text-neutral-600 mb-4 leading-relaxed ${compact ? 'text-sm line-clamp-2' : 'text-base line-clamp-3'}`}>
          {event.description}
        </p>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-center text-sm text-neutral-600">
            <div className="w-5 h-5 mr-3 text-primary-500">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-medium">{formatDate(event.date)}</span>
          </div>
          
          <div className="flex items-center text-sm text-neutral-600">
            <div className="w-5 h-5 mr-3 text-secondary-500">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-medium">{event.location}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-neutral-600">
              <div className="w-5 h-5 mr-3 text-accent-500">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="font-medium">{availableSpots} spots left</span>
            </div>
            
            {event.price ? (
              <div className="px-3 py-1 bg-gradient-to-r from-accent-100 to-accent-200 text-accent-800 rounded-full text-sm font-bold">
                ${event.price} {event.currency || 'USD'}
              </div>
            ) : (
              <div className="px-3 py-1 bg-gradient-to-r from-pastel-green to-pastel-mint text-accent-800 rounded-full text-sm font-bold">
                Free
              </div>
            )}
          </div>
        </div>
        
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {event.tags.slice(0, compact ? 2 : 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200"
              >
                {tag}
              </span>
            ))}
            {event.tags.length > (compact ? 2 : 3) && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                +{event.tags.length - (compact ? 2 : 3)} more
              </span>
            )}
          </div>
        )}
        
        <div className="flex gap-3">
          {showViewDetailsButton && (
            <Button
              variant="ghost"
              size={compact ? 'sm' : 'md'}
              onClick={() => onViewDetails?.(event.id)}
              fullWidth={!showRegisterButton}
              testId={`${testId}-view-details`}
            >
              View Details
            </Button>
          )}
          
          {showRegisterButton && (
            <Button
              variant={isFullyBooked ? 'pastel' : 'primary'}
              size={compact ? 'sm' : 'md'}
              onClick={() => onRegister?.(event.id)}
              disabled={isFullyBooked || registrationLoading}
              loading={registrationLoading}
              fullWidth={!showViewDetailsButton}
              testId={`${testId}-register`}
            >
              {isFullyBooked ? 'Fully Booked' : 'Register Now'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};