'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '../../shared/components/atoms/Button';
import { LoadingSpinner } from '../../shared/components/atoms/LoadingSpinner';
import { useEvent } from '../../shared/hooks/useEvents';
import { useWebSocket } from '../providers/WebSocketProvider';
import { EventStatus } from '../../shared/types';

interface EventDetailsProps {
  eventId: number;
}

export const EventDetails: React.FC<EventDetailsProps> = ({ eventId }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [liveRegistrationCount, setLiveRegistrationCount] = useState<number | null>(null);

  const { data: eventResponse, isLoading, isError, error } = useEvent(eventId);
  const { lastMessage, sendMessage, isConnected } = useWebSocket();
  const event = eventResponse?.data?.event;

  // Listen for real-time updates about this event
  useEffect(() => {
    if (lastMessage && event) {
      if (lastMessage.type === 'event_registration' && lastMessage.data.eventId === eventId) {
        setLiveRegistrationCount(lastMessage.data.currentRegistrations);
      }
      if (lastMessage.type === 'event_updated' && lastMessage.data.eventId === eventId) {
        // The useEvent query will be automatically invalidated by the WebSocket provider
        // Reset live count to let the fresh data from API take precedence
        setLiveRegistrationCount(null);
      }
    }
  }, [lastMessage, event, eventId]);

  // Join event-specific room for live updates
  useEffect(() => {
    if (isConnected && event) {
      sendMessage({
        type: 'join_event_room',
        data: { eventId: event.id }
      });

      // Leave room on unmount
      return () => {
        sendMessage({
          type: 'leave_event_room',
          data: { eventId: event.id }
        });
      };
    }
  }, [isConnected, event, sendMessage]);

  const handleRegister = async () => {
    if (!event) return;
    
    setIsRegistering(true);
    try {
      // This will be implemented with the registration API
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      console.log(`Registered for event ${event.id}`);
      
      // Emit registration event for real-time updates
      if (isConnected) {
        sendMessage({
          type: 'user_registered',
          data: { 
            eventId: event.id,
            eventTitle: event.title 
          }
        });
      }
      
      // Show success message or redirect
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case EventStatus.PUBLISHED:
        return 'bg-green-100 text-green-800';
      case EventStatus.DRAFT:
        return 'bg-yellow-100 text-yellow-800';
      case EventStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  // Use live registration count if available, otherwise fall back to API data
  const currentRegistrations = liveRegistrationCount !== null ? liveRegistrationCount : event?.currentRegistrations || 0;
  const isEventFull = event && currentRegistrations >= event.capacity;
  const isEventPast = event && new Date(event.date) < new Date();
  const canRegister = event && event.status === EventStatus.PUBLISHED && !isEventFull && !isEventPast;

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-neutral-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">
              Event Not Found
            </h2>
            <p className="text-neutral-600 mb-8">
              {error?.message || 'The event you are looking for does not exist.'}
            </p>
            <Link href="/events">
              <Button>
                Browse Events
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section */}
      <div className="relative h-96 bg-gradient-to-r from-primary-600 to-secondary-600 overflow-hidden">
        {event.imageUrl && (
          <div className="absolute inset-0">
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover opacity-30"
            />
          </div>
        )}
        <div className="relative h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
            <div className="max-w-4xl">
              <div className="flex items-center space-x-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(event.status)}`}>
                  {event.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium">
                  {event.category.replace('_', ' ')}
                </span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                {event.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-6 text-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span>{formatDate(event.date)}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span>{event.location}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                  <span className="flex items-center space-x-1">
                    <span>{currentRegistrations} / {event.capacity} attending</span>
                    {liveRegistrationCount !== null && (
                      <span className="inline-flex items-center justify-center w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live count" />
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <section className="glass rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">About This Event</h2>
              <div className="prose prose-neutral max-w-none">
                <p className="text-neutral-700 leading-relaxed">
                  {showFullDescription ? event.description : `${event.description.slice(0, 300)}...`}
                </p>
                {event.description.length > 300 && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="text-primary-600 hover:text-primary-700 font-medium mt-4"
                  >
                    {showFullDescription ? 'Show Less' : 'Read More'}
                  </button>
                )}
              </div>
            </section>

            {/* Agenda */}
            {event.agenda && event.agenda.length > 0 && (
              <section className="glass rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-neutral-900 mb-6">Event Agenda</h2>
                <div className="space-y-4">
                  {event.agenda.map((item: any, index: number) => (
                    <div key={index} className="flex space-x-4 p-4 rounded-xl bg-neutral-50">
                      <div className="flex-shrink-0 w-16 text-primary-600 font-medium">
                        {item.time}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-neutral-900 mb-1">{item.title}</h3>
                        <p className="text-neutral-600 text-sm">{item.description}</p>
                        {item.speaker && (
                          <p className="text-primary-600 text-sm mt-2">Speaker: {item.speaker}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <section className="glass rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-neutral-900 mb-6">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Registration Card */}
              <div className="glass rounded-2xl p-6">
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-neutral-900 mb-2">
                    {event.price === 0 ? 'Free' : `$${event.price}`}
                  </div>
                  {event.price > 0 && (
                    <p className="text-neutral-600">per person</p>
                  )}
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-600">Availability:</span>
                    <span className={`font-medium ${isEventFull ? 'text-red-600' : 'text-green-600'}`}>
                      {isEventFull ? 'Sold Out' : `${event.capacity - currentRegistrations} spots left`}
                    </span>
                  </div>
                  
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(currentRegistrations / event.capacity) * 100}%` }}
                    />
                  </div>
                </div>

                {canRegister ? (
                  <Button
                    onClick={handleRegister}
                    disabled={isRegistering}
                    className="w-full mb-4"
                    size="lg"
                  >
                    {isRegistering ? (
                      <div className="flex items-center justify-center space-x-2">
                        <LoadingSpinner size="sm" color="neutral" />
                        <span>Registering...</span>
                      </div>
                    ) : (
                      'Register Now'
                    )}
                  </Button>
                ) : (
                  <Button
                    disabled
                    className="w-full mb-4"
                    size="lg"
                  >
                    {isEventFull ? 'Sold Out' : isEventPast ? 'Event Ended' : 'Registration Closed'}
                  </Button>
                )}

                <p className="text-xs text-neutral-500 text-center">
                  By registering, you agree to our Terms of Service
                </p>
              </div>

              {/* Event Info */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Event Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Date & Time</label>
                    <p className="text-neutral-900">{formatDate(event.date)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Location</label>
                    <p className="text-neutral-900">{event.location}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
                    <p className="text-neutral-900">{event.category.replace('_', ' ')}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Organizer</label>
                    <p className="text-neutral-900">Event Organizer #{event.createdBy}</p>
                  </div>
                </div>
              </div>

              {/* Share */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Share Event</h3>
                <div className="flex space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = window.location.href;
                      navigator.share?.({ url, title: event.title }) || 
                      navigator.clipboard.writeText(url);
                    }}
                    className="flex-1"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                    </svg>
                    Share
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Add to calendar functionality
                      console.log('Add to calendar');
                    }}
                    className="flex-1"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Calendar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};