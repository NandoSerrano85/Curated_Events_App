-- Core database schema for the Events Platform
-- PostgreSQL schema for Go services (User, Event, Search, WebSocket Gateway)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create custom types
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
CREATE TYPE user_role AS ENUM ('user', 'organizer', 'admin', 'moderator');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');
CREATE TYPE event_visibility AS ENUM ('public', 'private', 'unlisted');
CREATE TYPE registration_status AS ENUM ('registered', 'cancelled', 'waitlisted', 'attended', 'no_show');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');
CREATE TYPE notification_type AS ENUM ('email', 'push', 'sms', 'in_app');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'read');

-- ============================================================================
-- USER MANAGEMENT TABLES
-- ============================================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    profile_image_url TEXT,
    bio TEXT,
    location VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    status user_status DEFAULT 'active',
    role user_role DEFAULT 'user',
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_categories TEXT[] DEFAULT '{}',
    preferred_locations TEXT[] DEFAULT '{}',
    interests TEXT[] DEFAULT '{}',
    price_range_min DECIMAL(10,2),
    price_range_max DECIMAL(10,2),
    notification_email BOOLEAN DEFAULT TRUE,
    notification_push BOOLEAN DEFAULT TRUE,
    notification_sms BOOLEAN DEFAULT FALSE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    event_reminders BOOLEAN DEFAULT TRUE,
    privacy_level VARCHAR(20) DEFAULT 'public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User social profiles
CREATE TABLE user_social_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    platform_user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    profile_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- ============================================================================
-- EVENT MANAGEMENT TABLES
-- ============================================================================

-- Event categories
CREATE TABLE event_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- Hex color code
    parent_id UUID REFERENCES event_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES users(id),
    category_id UUID REFERENCES event_categories(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT,
    image_url TEXT,
    images JSONB DEFAULT '[]',
    status event_status DEFAULT 'draft',
    visibility event_visibility DEFAULT 'public',
    is_virtual BOOLEAN DEFAULT FALSE,
    is_free BOOLEAN DEFAULT TRUE,
    
    -- Timing
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(50) NOT NULL,
    
    -- Venue information
    venue_name VARCHAR(255),
    venue_address TEXT,
    venue_city VARCHAR(100),
    venue_state VARCHAR(100),
    venue_country VARCHAR(100),
    venue_postal_code VARCHAR(20),
    venue_latitude DECIMAL(10, 8),
    venue_longitude DECIMAL(11, 8),
    
    -- Virtual event details
    virtual_url TEXT,
    virtual_platform VARCHAR(50),
    virtual_meeting_id VARCHAR(255),
    virtual_password VARCHAR(100),
    
    -- Capacity and registration
    max_attendees INTEGER,
    registration_opens_at TIMESTAMP WITH TIME ZONE,
    registration_closes_at TIMESTAMP WITH TIME ZONE,
    allow_waitlist BOOLEAN DEFAULT FALSE,
    require_approval BOOLEAN DEFAULT FALSE,
    
    -- Pricing
    base_price DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Tags and metadata
    tags TEXT[] DEFAULT '{}',
    external_url TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    
    -- SEO and social
    meta_title VARCHAR(255),
    meta_description TEXT,
    social_image_url TEXT,
    
    -- Statistics (updated by triggers)
    view_count INTEGER DEFAULT 0,
    registration_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Timestamps
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event ticket types
CREATE TABLE event_ticket_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    quantity_total INTEGER,
    quantity_sold INTEGER DEFAULT 0,
    quantity_reserved INTEGER DEFAULT 0,
    min_quantity_per_order INTEGER DEFAULT 1,
    max_quantity_per_order INTEGER DEFAULT 10,
    sales_start_at TIMESTAMP WITH TIME ZONE,
    sales_end_at TIMESTAMP WITH TIME ZONE,
    is_donation BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event registrations
CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id),
    user_id UUID NOT NULL REFERENCES users(id),
    ticket_type_id UUID REFERENCES event_ticket_types(id),
    status registration_status DEFAULT 'registered',
    quantity INTEGER DEFAULT 1,
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Attendee information
    attendee_name VARCHAR(255),
    attendee_email VARCHAR(255),
    attendee_phone VARCHAR(20),
    custom_fields JSONB DEFAULT '{}',
    
    -- Registration metadata
    registration_source VARCHAR(50), -- web, mobile, api, etc.
    referral_code VARCHAR(50),
    promo_code VARCHAR(50),
    notes TEXT,
    
    -- Check-in information
    checked_in_at TIMESTAMP WITH TIME ZONE,
    check_in_location VARCHAR(255),
    
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(event_id, user_id)
);

-- Event favorites/bookmarks
CREATE TABLE event_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Event reviews and ratings
CREATE TABLE event_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review_text TEXT,
    is_verified BOOLEAN DEFAULT FALSE, -- True if user attended the event
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- ============================================================================
-- PAYMENT TABLES
-- ============================================================================

-- Payment transactions
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL REFERENCES event_registrations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    event_id UUID NOT NULL REFERENCES events(id),
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(50), -- stripe, paypal, apple_pay, etc.
    status payment_status DEFAULT 'pending',
    
    -- External payment service details
    external_payment_id VARCHAR(255),
    external_customer_id VARCHAR(255),
    payment_intent_id VARCHAR(255),
    
    -- Transaction metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    failure_reason TEXT,
    receipt_url TEXT,
    
    -- Timestamps
    processed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATION TABLES
-- ============================================================================

-- Notification templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    type notification_type NOT NULL,
    subject VARCHAR(255),
    body_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- Array of variable names used in template
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES notification_templates(id),
    type notification_type NOT NULL,
    status notification_status DEFAULT 'pending',
    
    -- Content
    subject VARCHAR(255),
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    
    -- Delivery details
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    external_id VARCHAR(255), -- ID from email service, push service, etc.
    
    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SEARCH AND DISCOVERY TABLES
-- ============================================================================

-- Search queries (for analytics)
CREATE TABLE search_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    clicked_result_ids UUID[] DEFAULT '{}',
    location VARCHAR(255),
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Popular searches cache
CREATE TABLE popular_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query TEXT UNIQUE NOT NULL,
    search_count INTEGER DEFAULT 1,
    last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SESSION AND CACHE TABLES
-- ============================================================================

-- User sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API rate limiting
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL, -- IP address, user ID, or API key
    endpoint VARCHAR(255) NOT NULL,
    requests_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(identifier, endpoint, window_start)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Events indexes
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_category_id ON events(category_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_visibility ON events(visibility);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_end_time ON events(end_time);
CREATE INDEX idx_events_is_virtual ON events(is_virtual);
CREATE INDEX idx_events_is_free ON events(is_free);
CREATE INDEX idx_events_venue_city ON events(venue_city);
CREATE INDEX idx_events_venue_country ON events(venue_country);
CREATE INDEX idx_events_published_at ON events(published_at);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_slug ON events(slug);

-- GiST indexes for location-based queries
CREATE INDEX idx_events_location ON events USING GIST(
    ll_to_earth(venue_latitude, venue_longitude)
) WHERE venue_latitude IS NOT NULL AND venue_longitude IS NOT NULL;

-- Full-text search indexes
CREATE INDEX idx_events_title_fts ON events USING GIN(to_tsvector('english', title));
CREATE INDEX idx_events_description_fts ON events USING GIN(to_tsvector('english', coalesce(short_description, '') || ' ' || coalesce(long_description, '')));

-- Array indexes
CREATE INDEX idx_events_tags ON events USING GIN(tags);

-- Registrations indexes
CREATE INDEX idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_user_id ON event_registrations(user_id);
CREATE INDEX idx_event_registrations_status ON event_registrations(status);
CREATE INDEX idx_event_registrations_registered_at ON event_registrations(registered_at);

-- Payments indexes
CREATE INDEX idx_payments_registration_id ON payments(registration_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_event_id ON payments(event_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_external_payment_id ON payments(external_payment_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled_at ON notifications(scheduled_at);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);

-- Sessions indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);

-- Search indexes
CREATE INDEX idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX idx_search_queries_created_at ON search_queries(created_at);
CREATE INDEX idx_popular_searches_search_count ON popular_searches(search_count DESC);

-- Compound indexes for common queries
CREATE INDEX idx_events_status_visibility_start_time ON events(status, visibility, start_time);
CREATE INDEX idx_events_category_start_time ON events(category_id, start_time);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_event_favorites_user_event ON event_favorites(user_id, event_id);
CREATE INDEX idx_event_reviews_event_rating ON event_reviews(event_id, rating);