import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { APIError } from '../types';

// API configuration - Support multiple environments
const getEnvVar = (name: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[name];
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }
  return undefined;
};

const API_BASE_URL = getEnvVar('VITE_API_URL') || 
                    getEnvVar('NEXT_PUBLIC_API_URL') || 
                    getEnvVar('REACT_APP_API_URL') || 
                    'http://localhost:8080/api';
const REQUEST_TIMEOUT = 30000; // 30 seconds
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

// Create axios instance
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: REQUEST_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  // Request interceptor for authentication
  client.interceptors.request.use(
    (config) => {
      const { tokens } = useAuthStore.getState();
      
      if (tokens?.accessToken) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
      }
      
      // Add request timestamp for debugging
      config.metadata = { startTime: Date.now() };
      
      return config;
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling and token refresh
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // Add response time for monitoring
      if (response.config.metadata) {
        const responseTime = Date.now() - response.config.metadata.startTime;
        console.debug(`API Response Time: ${responseTime}ms for ${response.config.url}`);
      }
      
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _retryCount?: number };
      
      // Handle network errors
      if (!error.response) {
        console.error('Network error:', error.message);
        useAppStore.getState().addNotification({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to the server. Please check your internet connection.',
        });
        return Promise.reject(error);
      }
      
      // Handle 401 Unauthorized - attempt token refresh
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          const { refreshToken } = useAuthStore.getState();
          await refreshToken();
          
          // Retry the original request with new token
          const { tokens } = useAuthStore.getState();
          if (tokens?.accessToken && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
            return client(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, logout user
          useAuthStore.getState().logout();
          useAppStore.getState().addNotification({
            type: 'error',
            title: 'Session Expired',
            message: 'Your session has expired. Please log in again.',
          });
          return Promise.reject(error);
        }
      }
      
      // Handle 403 Forbidden
      if (error.response.status === 403) {
        useAppStore.getState().addNotification({
          type: 'error',
          title: 'Access Denied',
          message: 'You do not have permission to perform this action.',
        });
      }
      
      // Handle 429 Too Many Requests - implement retry with exponential backoff
      if (error.response.status === 429 && (!originalRequest._retryCount || originalRequest._retryCount < RETRY_ATTEMPTS)) {
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
        const delay = RETRY_DELAY * Math.pow(2, originalRequest._retryCount - 1);
        
        console.warn(`Rate limited, retrying in ${delay}ms (attempt ${originalRequest._retryCount})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return client(originalRequest);
      }
      
      // Handle 5xx server errors - implement retry
      if (error.response.status >= 500 && (!originalRequest._retryCount || originalRequest._retryCount < RETRY_ATTEMPTS)) {
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
        const delay = RETRY_DELAY * originalRequest._retryCount;
        
        console.warn(`Server error, retrying in ${delay}ms (attempt ${originalRequest._retryCount})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return client(originalRequest);
      }
      
      // Format error response
      const apiError: APIError = {
        message: error.response.data?.message || error.message || 'An unexpected error occurred',
        code: error.response.data?.code || `HTTP_${error.response.status}`,
        details: error.response.data?.details || {},
        timestamp: new Date().toISOString(),
      };
      
      // Log error for monitoring
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response.status,
        error: apiError,
      });
      
      // Show user-friendly error notification
      if (error.response.status >= 400) {
        useAppStore.getState().addNotification({
          type: 'error',
          title: 'Request Failed',
          message: apiError.message,
        });
      }
      
      return Promise.reject(apiError);
    }
  );

  return client;
};

// Create the main API client instance
export const apiClient = createApiClient();

// Helper function to check if error is an API error
export const isAPIError = (error: any): error is APIError => {
  return error && typeof error.message === 'string' && typeof error.code === 'string';
};

// Helper function to extract error message
export const getErrorMessage = (error: any): string => {
  if (isAPIError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// API health check
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    await apiClient.get('/health');
    return true;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};

// Request/Response logging for development
const isDevelopment = (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development') || 
                     (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');

if (isDevelopment) {
  apiClient.interceptors.request.use((config) => {
    console.debug('🚀 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      params: config.params,
      data: config.data,
    });
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => {
      console.debug('✅ API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data,
      });
      return response;
    },
    (error) => {
      console.error('❌ API Error:', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.message,
        data: error.response?.data,
      });
      return Promise.reject(error);
    }
  );
}

// Type augmentation for request config
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
    _retry?: boolean;
    _retryCount?: number;
  }
}