// API endpoint constants based on the actual backend API reference
export const API_ENDPOINTS = {
  // Authentication endpoints
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    LOGOUT: '/api/v1/auth/logout',
    REFRESH: '/api/v1/auth/refresh',
    CHANGE_PASSWORD: '/api/v1/auth/change-password',
    FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
    RESET_PASSWORD: '/api/v1/auth/reset-password',
  },

  // User endpoints
  USERS: {
    PROFILE: '/api/v1/users/profile',
    REGISTRATIONS: '/api/v1/users/registrations',
    DELETE_ACCOUNT: '/api/v1/users/account',
  },

  // Event endpoints
  EVENTS: {
    BASE: '/api/v1/events',
    BY_ID: (id: number) => `/api/v1/events/${id}`,
    REGISTER: (id: number) => `/api/v1/events/${id}/register`,
    ATTENDEES: (id: number) => `/api/v1/events/${id}/attendees`,
    STATUS: (id: number) => `/api/v1/events/${id}/status`,
  },

  // Registration endpoints
  REGISTRATIONS: {
    BASE: '/registrations',
    BY_ID: (id: number) => `/registrations/${id}`,
    BY_USER: (userId: number) => `/registrations/user/${userId}`,
    BY_EVENT: (eventId: number) => `/registrations/event/${eventId}`,
  },

  // Search endpoints
  SEARCH: {
    EVENTS: '/api/v1/search/events',
    SUGGESTIONS: '/api/v1/search/suggest',
    ADVANCED: '/api/v1/search/advanced',
    ANALYTICS: '/api/v1/search/analytics',
  },

  // Recommendation endpoints
  RECOMMENDATIONS: {
    EVENTS: '/api/v1/recommendations/events',
    SIMILAR: (eventId: number) => `/api/v1/recommendations/events/${eventId}/similar`,
    TRENDING: '/api/v1/recommendations/trending',
    PREFERENCES: '/api/v1/recommendations/preferences',
    FEEDBACK: '/api/v1/recommendations/feedback',
  },

  // Analytics endpoints
  ANALYTICS: {
    EVENT: (eventId: number) => `/api/v1/analytics/events/${eventId}`,
    USER_BEHAVIOR: (userId: number) => `/api/v1/analytics/users/${userId}/behavior`,
    DASHBOARD: '/api/v1/analytics/dashboard',
    CUSTOM_QUERY: '/api/v1/analytics/query',
  },

  // Upload endpoints
  UPLOADS: {
    IMAGE: '/uploads/image',
    FILE: '/uploads/file',
    AVATAR: '/uploads/avatar',
    EVENT_IMAGE: '/uploads/event-image',
  },

  // Notification endpoints
  NOTIFICATIONS: {
    BASE: '/notifications',
    BY_ID: (id: string) => `/notifications/${id}`,
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
    SETTINGS: '/notifications/settings',
  },

  // System endpoints
  SYSTEM: {
    HEALTH: '/health',
    METRICS: '/metrics',
  },

  // WebSocket endpoints - from API reference
  WEBSOCKET: {
    BASE: '/ws',
  },
} as const;

// Helper function to build URL with query parameters
export const buildUrl = (endpoint: string, params?: Record<string, any>): string => {
  if (!params) return endpoint;
  
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
};

// Helper function to replace URL parameters
export const replaceUrlParams = (url: string, params: Record<string, string | number>): string => {
  let result = url;
  
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`:${key}`, String(value));
  });
  
  return result;
};

// Type definitions for API responses
export type APIEndpoint = typeof API_ENDPOINTS;
export type EndpointPath = string;