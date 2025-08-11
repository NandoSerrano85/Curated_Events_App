// Core data types for the Events Platform
export interface User {
  id: number;
  email: string;
  name: string;
  profile?: UserProfile;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  avatar?: string;
  bio?: string;
  location?: string;
  interests?: string[];
  preferences?: UserPreferences;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    profileVisible: boolean;
    eventsVisible: boolean;
  };
}

export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  capacity: number;
  currentRegistrations: number;
  category: EventCategory;
  tags: string[];
  price?: number;
  currency?: string;
  createdBy: number;
  creator?: User;
  imageUrl?: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EventRegistration {
  id: number;
  eventId: number;
  userId: number;
  status: RegistrationStatus;
  registeredAt: string;
  event?: Event;
  user?: User;
}

export interface Recommendation {
  id: string;
  eventId: number;
  score: number;
  reason: string;
  algorithm: string;
  event?: Event;
}

export interface SearchQuery {
  text?: string;
  category?: EventCategory;
  location?: {
    lat: number;
    lng: number;
    radius: number;
  };
  dateRange?: {
    start: string;
    end: string;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
  sortBy?: 'date' | 'relevance' | 'popularity' | 'price';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResults {
  events: Event[];
  total: number;
  facets?: SearchFacets;
  suggestions?: string[];
}

export interface SearchFacets {
  categories: { name: string; count: number }[];
  locations: { name: string; count: number }[];
  priceRanges: { range: string; count: number }[];
  tags: { name: string; count: number }[];
}

// Enums
export enum EventCategory {
  TECHNOLOGY = 'technology',
  BUSINESS = 'business',
  ARTS = 'arts',
  SPORTS = 'sports',
  MUSIC = 'music',
  FOOD = 'food',
  EDUCATION = 'education',
  HEALTH = 'health',
  TRAVEL = 'travel',
  OTHER = 'other'
}

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

export enum RegistrationStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  WAITLIST = 'waitlist'
}

// API Response types
export interface APIResponse<T> {
  data: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

export interface APIError {
  message: string;
  code: string;
  details?: Record<string, any>;
  timestamp: string;
}

// Authentication types
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  profile?: UserProfile;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  userId?: number;
  room?: string;
}

export interface RealTimeUpdate {
  type: 'event_created' | 'event_updated' | 'registration_update' | 'user_activity';
  data: any;
  eventId?: number;
  userId?: number;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  testId?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'multiselect' | 'date' | 'number';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export interface FormData {
  [key: string]: any;
}

export interface FormErrors {
  [key: string]: string;
}