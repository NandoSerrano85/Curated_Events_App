'use client';

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import type { Event, EventItem } from '@/types/event';

export const useLiveEventUpdates = () => {
  const queryClient = useQueryClient();
  const { isConnected, subscribe } = useWebSocket();

  // Handle event updates from WebSocket
  const handleEventUpdate = useCallback((data: any) => {
    const { eventId, event, type } = data;

    if (type === 'event_updated') {
      // Update event in all relevant queries
      queryClient.setQueryData(['event', eventId], event);
      
      // Update events list queries
      queryClient.setQueriesData(
        { queryKey: ['events'], exact: false },
        (oldData: EventItem[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(item => 
            item.id === eventId 
              ? { ...item, ...eventToEventItem(event) }
              : item
          );
        }
      );
    } else if (type === 'event_deleted') {
      // Remove event from all queries
      queryClient.removeQueries({ queryKey: ['event', eventId] });
      queryClient.setQueriesData(
        { queryKey: ['events'], exact: false },
        (oldData: EventItem[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter(item => item.id !== eventId);
        }
      );
    } else if (type === 'event_created') {
      // Invalidate events list to show new event
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  }, [queryClient]);

  // Handle registration updates
  const handleRegistrationUpdate = useCallback((data: any) => {
    const { eventId, registration, type } = data;

    if (type === 'registration_confirmed' || type === 'registration_cancelled') {
      // Update event capacity data
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  }, [queryClient]);

  // Handle capacity updates
  const handleCapacityUpdate = useCallback((data: any) => {
    const { eventId, currentCapacity, spotsRemaining } = data;

    // Update event capacity in real-time
    queryClient.setQueryData(['event', eventId], (oldData: Event | undefined) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        currentCapacity,
        spotsRemaining,
        canRegister: spotsRemaining > 0,
      };
    });

    // Update events list capacity
    queryClient.setQueriesData(
      { queryKey: ['events'], exact: false },
      (oldData: EventItem[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(item =>
          item.id === eventId
            ? { ...item, capacity: spotsRemaining }
            : item
        );
      }
    );
  }, [queryClient]);

  // Subscribe to WebSocket events when connected
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeEvent = subscribe('event_updates', handleEventUpdate);
    const unsubscribeRegistration = subscribe('registration_updates', handleRegistrationUpdate);
    const unsubscribeCapacity = subscribe('capacity_updates', handleCapacityUpdate);

    return () => {
      unsubscribeEvent();
      unsubscribeRegistration();
      unsubscribeCapacity();
    };
  }, [isConnected, subscribe, handleEventUpdate, handleRegistrationUpdate, handleCapacityUpdate]);

  return {
    isConnected,
  };
};

// Helper function to convert Event to EventItem
function eventToEventItem(event: Event): Partial<EventItem> {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.startTime,
    location: event.isVirtual ? 'Virtual' : (event.venueName || event.venueAddress || 'TBD'),
    category: event.category,
    imageUrl: event.images.length > 0 ? event.images[0] : undefined,
    capacity: event.spotsRemaining || event.maxCapacity,
  };
}