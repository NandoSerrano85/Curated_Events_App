-- Create events and related tables

-- Create custom types
CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');
CREATE TYPE event_visibility AS ENUM ('public', 'private', 'unlisted');
CREATE TYPE registration_status AS ENUM ('registered', 'cancelled', 'waitlisted', 'attended', 'no_show');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');

-- Enable PostGIS for geographic queries
CREATE EXTENSION IF NOT EXISTS "earthdistance";
CREATE EXTENSION IF NOT EXISTS "cube";

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

-- Event favorites
CREATE TABLE event_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Event reviews
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

-- Indexes
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

-- Other table indexes
CREATE INDEX idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_user_id ON event_registrations(user_id);
CREATE INDEX idx_event_registrations_status ON event_registrations(status);
CREATE INDEX idx_event_registrations_registered_at ON event_registrations(registered_at);

CREATE INDEX idx_payments_registration_id ON payments(registration_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_event_id ON payments(event_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_external_payment_id ON payments(external_payment_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);

CREATE INDEX idx_event_favorites_user_event ON event_favorites(user_id, event_id);
CREATE INDEX idx_event_reviews_event_rating ON event_reviews(event_id, rating);

-- Compound indexes for common queries
CREATE INDEX idx_events_status_visibility_start_time ON events(status, visibility, start_time);
CREATE INDEX idx_events_category_start_time ON events(category_id, start_time);