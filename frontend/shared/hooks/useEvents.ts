import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Event, SearchQuery, SearchResults, APIResponse } from '../types';
import { apiClient } from '../api/client';

// Query keys
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters: SearchQuery) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: number) => [...eventKeys.details(), id] as const,
  search: (query: SearchQuery) => [...eventKeys.all, 'search', query] as const,
  recommendations: (userId: number) => [...eventKeys.all, 'recommendations', userId] as const,
};

// Fetch events with pagination
export const useEvents = (query: SearchQuery = {}, enabled = true) => {
  return useInfiniteQuery({
    queryKey: eventKeys.list(query),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await apiClient.get<APIResponse<SearchResults>>('/events', {
        params: {
          ...query,
          offset: pageParam,
          limit: query.limit || 20,
        },
      });
      return response.data;
    },
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.meta?.hasNext) return undefined;
      return (lastPage.meta.page || 0) + 1;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Fetch single event details
export const useEvent = (id: number, enabled = true) => {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<Event>>(`/events/${id}`);
      return response.data.data;
    },
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

// Search events
export const useSearchEvents = (query: SearchQuery, enabled = true) => {
  return useQuery({
    queryKey: eventKeys.search(query),
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<SearchResults>>('/events/search', {
        params: query,
      });
      return response.data.data;
    },
    enabled: enabled && (!!query.text || !!query.category || !!query.location),
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
    cacheTime: 5 * 60 * 1000,
  });
};

// Get event recommendations
export const useEventRecommendations = (userId: number, eventId?: number, enabled = true) => {
  return useQuery({
    queryKey: eventKeys.recommendations(userId),
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<Event[]>>(`/recommendations/events`, {
        params: {
          userId,
          eventId,
          limit: 10,
        },
      });
      return response.data.data;
    },
    enabled: enabled && !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 15 * 60 * 1000,
  });
};

// Create event mutation
export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: Partial<Event>) => {
      const response = await apiClient.post<APIResponse<Event>>('/events', eventData);
      return response.data.data;
    },
    onSuccess: (newEvent) => {
      // Invalidate events lists
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      
      // Add to cache
      queryClient.setQueryData(eventKeys.detail(newEvent.id), newEvent);
    },
  });
};

// Update event mutation
export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...eventData }: Partial<Event> & { id: number }) => {
      const response = await apiClient.put<APIResponse<Event>>(`/events/${id}`, eventData);
      return response.data.data;
    },
    onSuccess: (updatedEvent) => {
      // Update cache
      queryClient.setQueryData(eventKeys.detail(updatedEvent.id), updatedEvent);
      
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
};

// Delete event mutation
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/events/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: eventKeys.detail(deletedId) });
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
};

// Register for event mutation
export const useRegisterForEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: number; userId: number }) => {
      const response = await apiClient.post<APIResponse<any>>(`/events/${eventId}/register`, {
        userId,
      });
      return response.data;
    },
    onSuccess: (_, { eventId }) => {
      // Invalidate event details to refresh registration count
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      
      // Invalidate user's registrations
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
  });
};

// Cancel event registration mutation
export const useCancelRegistration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: number; userId: number }) => {
      await apiClient.delete(`/events/${eventId}/register`, {
        data: { userId },
      });
      return { eventId, userId };
    },
    onSuccess: (_, { eventId }) => {
      // Invalidate event details to refresh registration count
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      
      // Invalidate user's registrations
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
  });
};

// Custom hook to prefetch event details
export const usePrefetchEvent = () => {
  const queryClient = useQueryClient();

  return (id: number) => {
    queryClient.prefetchQuery({
      queryKey: eventKeys.detail(id),
      queryFn: async () => {
        const response = await apiClient.get<APIResponse<Event>>(`/events/${id}`);
        return response.data.data;
      },
      staleTime: 5 * 60 * 1000,
    });
  };
};