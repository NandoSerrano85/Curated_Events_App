export type EventCategory = "technology" | "music" | "art" | "sports" | "business" | "education" | "health" | "travel" | "food" | "other";

export type EventStatus = "draft" | "published" | "cancelled" | "completed";

export type RegistrationStatus = "pending" | "confirmed" | "cancelled" | "waitlist";

export interface Event {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  category: EventCategory;
  tags: string[];
  organizerId: string;
  organizerName: string;
  venueId?: string;
  venueName?: string;
  venueAddress?: string;
  isVirtual: boolean;
  virtualUrl?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  timezone: string;
  isPaid: boolean;
  price?: number;
  currency: string;
  maxCapacity?: number;
  currentCapacity: number;
  registrationFee?: number;
  images: string[];
  status: EventStatus;
  isPublished: boolean;
  isFeatured: boolean;
  curationScore?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;

  // Computed fields
  isRegistered?: boolean;
  canRegister?: boolean;
  spotsRemaining?: number;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  shortDescription?: string;
  category: EventCategory;
  tags?: string[];
  venueId?: string;
  venueName?: string;
  venueAddress?: string;
  isVirtual: boolean;
  virtualUrl?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  timezone: string;
  isPaid: boolean;
  price?: number;
  currency?: string;
  maxCapacity?: number;
  registrationFee?: number;
  images?: string[];
}

export interface EventFilters {
  category?: EventCategory | 'all';
  tags?: string[];
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  isVirtual?: boolean;
  isFree?: boolean;
  hasAvailableSpots?: boolean;
  organizerId?: string;
  featured?: boolean;
  status?: EventStatus;
  
  // Pagination
  page?: number;
  pageSize?: number;
  
  // Sorting
  sortBy?: "start_time" | "created_at" | "price" | "popularity";
  sortOrder?: "asc" | "desc";

  // Search query
  q?: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: RegistrationStatus;
  paymentId?: string;
  paymentStatus?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterEventRequest {
  eventId: string;
  metadata?: Record<string, any>;
}

export interface EventStats {
  eventId: string;
  totalRegistrations: number;
  confirmedRegistrations: number;
  waitlistRegistrations: number;
  totalRevenue: number;
  viewCount: number;
  shareCount: number;
  updatedAt: string;
}

export interface EventListResponse {
  events: Event[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Legacy type for backward compatibility
export interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string; // ISO string - mapped from startTime
  location: string; // mapped from venueName or "Virtual"
  category: EventCategory;
  imageUrl?: string; // mapped from first image
  capacity?: number; // mapped from maxCapacity
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}

// Search types
export interface SearchResponse<T> {
  results: T[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  filters?: EventFilters;
  suggestions?: string[];
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  channel?: string;
  eventId?: string;
  data?: any;
}