import { create } from 'zustand';
import { SearchQuery, SearchResults, EventCategory } from '../types';

interface AppState {
  // Navigation state
  currentPage: string;
  previousPage: string | null;
  
  // Search state
  searchQuery: SearchQuery;
  searchResults: SearchResults | null;
  isSearching: boolean;
  searchHistory: string[];
  
  // UI state
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  theme: 'light' | 'dark' | 'auto';
  
  // Filters
  activeFilters: {
    categories: EventCategory[];
    priceRange: { min: number; max: number } | null;
    dateRange: { start: string; end: string } | null;
    location: { lat: number; lng: number; radius: number } | null;
  };
  
  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
  }>;
  
  // Loading states
  globalLoading: boolean;
  loadingStates: { [key: string]: boolean };
  
  // Error handling
  globalError: string | null;
  errors: { [key: string]: string };
}

interface AppActions {
  // Navigation actions
  setCurrentPage: (page: string) => void;
  goBack: () => void;
  
  // Search actions
  setSearchQuery: (query: SearchQuery) => void;
  clearSearch: () => void;
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  
  // UI actions
  toggleSidebar: () => void;
  closeSidebar: () => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  
  // Filter actions
  setFilters: (filters: Partial<AppState['activeFilters']>) => void;
  clearFilters: () => void;
  
  // Notification actions
  addNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Loading actions
  setGlobalLoading: (loading: boolean) => void;
  setLoading: (key: string, loading: boolean) => void;
  clearLoading: (key: string) => void;
  
  // Error actions
  setGlobalError: (error: string | null) => void;
  setError: (key: string, error: string) => void;
  clearError: (key: string) => void;
  clearAllErrors: () => void;
}

export type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()((set, get) => ({
  // Initial state
  currentPage: '/',
  previousPage: null,
  
  searchQuery: {},
  searchResults: null,
  isSearching: false,
  searchHistory: [],
  
  sidebarOpen: false,
  mobileMenuOpen: false,
  theme: 'auto',
  
  activeFilters: {
    categories: [],
    priceRange: null,
    dateRange: null,
    location: null,
  },
  
  notifications: [],
  
  globalLoading: false,
  loadingStates: {},
  
  globalError: null,
  errors: {},

  // Actions
  setCurrentPage: (page: string) => {
    set((state) => ({
      previousPage: state.currentPage,
      currentPage: page,
    }));
  },

  goBack: () => {
    const { previousPage } = get();
    if (previousPage) {
      set({
        currentPage: previousPage,
        previousPage: null,
      });
    }
  },

  setSearchQuery: (query: SearchQuery) => {
    set({ searchQuery: query });
  },

  clearSearch: () => {
    set({
      searchQuery: {},
      searchResults: null,
    });
  },

  addToSearchHistory: (query: string) => {
    set((state) => {
      const history = state.searchHistory.filter(q => q !== query);
      return {
        searchHistory: [query, ...history].slice(0, 10), // Keep last 10 searches
      };
    });
  },

  clearSearchHistory: () => {
    set({ searchHistory: [] });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  closeSidebar: () => {
    set({ sidebarOpen: false });
  },

  toggleMobileMenu: () => {
    set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen }));
  },

  closeMobileMenu: () => {
    set({ mobileMenuOpen: false });
  },

  setTheme: (theme: 'light' | 'dark' | 'auto') => {
    set({ theme });
  },

  setFilters: (filters: Partial<AppState['activeFilters']>) => {
    set((state) => ({
      activeFilters: { ...state.activeFilters, ...filters },
    }));
  },

  clearFilters: () => {
    set({
      activeFilters: {
        categories: [],
        priceRange: null,
        dateRange: null,
        location: null,
      },
    });
  },

  addNotification: (notification) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = {
      ...notification,
      id,
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    set((state) => ({
      notifications: [newNotification, ...state.notifications],
    }));
    
    // Auto-remove success notifications after 5 seconds
    if (notification.type === 'success') {
      setTimeout(() => {
        get().removeNotification(id);
      }, 5000);
    }
  },

  markNotificationRead: (id: string) => {
    set((state) => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  removeNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id),
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },

  setGlobalLoading: (loading: boolean) => {
    set({ globalLoading: loading });
  },

  setLoading: (key: string, loading: boolean) => {
    set((state) => ({
      loadingStates: loading
        ? { ...state.loadingStates, [key]: true }
        : { ...state.loadingStates, [key]: false },
    }));
  },

  clearLoading: (key: string) => {
    set((state) => {
      const { [key]: _, ...rest } = state.loadingStates;
      return { loadingStates: rest };
    });
  },

  setGlobalError: (error: string | null) => {
    set({ globalError: error });
  },

  setError: (key: string, error: string) => {
    set((state) => ({
      errors: { ...state.errors, [key]: error },
    }));
  },

  clearError: (key: string) => {
    set((state) => {
      const { [key]: _, ...rest } = state.errors;
      return { errors: rest };
    });
  },

  clearAllErrors: () => {
    set({ errors: {}, globalError: null });
  },
}));