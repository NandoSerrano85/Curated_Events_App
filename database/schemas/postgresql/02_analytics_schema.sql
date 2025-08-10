-- Analytics database schema for Python services
-- Separate database for analytics data to optimize for analytical workloads

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create custom types for analytics
CREATE TYPE analytics_event_type AS ENUM (
    'user_registration', 'user_login', 'event_view', 'event_click', 'event_registration',
    'event_cancellation', 'search_query', 'recommendation_view', 'recommendation_click',
    'payment_initiated', 'payment_completed', 'payment_failed', 'email_sent', 'email_opened',
    'email_clicked', 'push_notification_sent', 'push_notification_clicked'
);

CREATE TYPE metric_type AS ENUM (
    'count', 'sum', 'average', 'median', 'percentile', 'unique_count', 'rate', 'ratio'
);

CREATE TYPE time_granularity AS ENUM (
    'minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'
);

CREATE TYPE user_segment AS ENUM (
    'new_users', 'active_users', 'power_users', 'at_risk_users', 'churned_users',
    'vip_users', 'organizers', 'attendees'
);

CREATE TYPE report_type AS ENUM (
    'user_engagement', 'event_performance', 'revenue_analysis', 'funnel_analysis',
    'cohort_analysis', 'ab_test_results', 'recommendation_performance',
    'geographic_analysis', 'trend_analysis', 'custom'
);

-- ============================================================================
-- ANALYTICS EVENTS TABLE
-- ============================================================================

-- Raw analytics events (high-volume table)
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type analytics_event_type NOT NULL,
    user_id UUID, -- References users table in main database
    session_id VARCHAR(100),
    entity_id UUID, -- ID of the entity (event, recommendation, etc.)
    entity_type VARCHAR(50),
    
    -- Event properties (flexible JSON structure)
    properties JSONB DEFAULT '{}',
    
    -- Context information
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    
    -- Geographic data
    country VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Timestamp (partitioned by this column)
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ingestion metadata
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source VARCHAR(50) DEFAULT 'api' -- api, batch, stream, etc.
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions for analytics_events
-- This improves query performance and allows efficient data retention

-- Create partitions for current and future months
CREATE TABLE analytics_events_2024_01 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE analytics_events_2024_02 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE analytics_events_2024_03 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

CREATE TABLE analytics_events_2024_04 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');

CREATE TABLE analytics_events_2024_05 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');

CREATE TABLE analytics_events_2024_06 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');

-- ============================================================================
-- METRIC SUMMARIES TABLE
-- ============================================================================

-- Pre-computed metric summaries for fast querying
CREATE TABLE metric_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_type metric_type NOT NULL,
    dimensions JSONB DEFAULT '{}', -- Key-value pairs for dimensions
    value DECIMAL(15,4) NOT NULL,
    
    -- Time dimensions
    date DATE NOT NULL,
    granularity time_granularity NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure uniqueness per metric/dimensions/date/granularity combination
    UNIQUE(metric_name, dimensions, date, granularity)
) PARTITION BY RANGE (date);

-- Create quarterly partitions for metric_summaries
CREATE TABLE metric_summaries_2024_q1 PARTITION OF metric_summaries
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE metric_summaries_2024_q2 PARTITION OF metric_summaries
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

CREATE TABLE metric_summaries_2024_q3 PARTITION OF metric_summaries
    FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');

CREATE TABLE metric_summaries_2024_q4 PARTITION OF metric_summaries
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');

-- ============================================================================
-- USER SEGMENTS TABLE
-- ============================================================================

-- User segmentation assignments
CREATE TABLE user_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References users table in main database
    segment user_segment NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 1.0, -- 0.00 to 1.00
    characteristics JSONB DEFAULT '{}',
    
    -- Lifecycle
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL means never expires
    
    -- Ensure one active segment per user
    UNIQUE(user_id, segment, assigned_at)
);

-- ============================================================================
-- RECOMMENDATION TRACKING
-- ============================================================================

-- Recommendation requests and responses
CREATE TABLE recommendation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    request_id UUID NOT NULL,
    algorithm_used VARCHAR(50) NOT NULL,
    context JSONB DEFAULT '{}',
    
    -- Recommendations served
    recommendations JSONB NOT NULL, -- Array of recommended items
    total_count INTEGER NOT NULL,
    processing_time_ms INTEGER,
    model_version VARCHAR(20),
    
    -- Quality metrics
    user_profile_completeness DECIMAL(3,2),
    cold_start_user BOOLEAN DEFAULT FALSE,
    fallback_used BOOLEAN DEFAULT FALSE,
    
    -- Interaction tracking
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for recommendation_logs
CREATE TABLE recommendation_logs_2024_01 PARTITION OF recommendation_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE recommendation_logs_2024_02 PARTITION OF recommendation_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE recommendation_logs_2024_03 PARTITION OF recommendation_logs
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- ============================================================================
-- A/B TESTING TABLES
-- ============================================================================

-- A/B test experiments
CREATE TABLE ab_experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hypothesis TEXT,
    
    -- Configuration
    variants JSONB NOT NULL, -- Array of variant configurations
    traffic_allocation JSONB NOT NULL, -- Percentage allocation per variant
    target_metric VARCHAR(100) NOT NULL,
    
    -- Status and lifecycle
    status VARCHAR(20) DEFAULT 'draft', -- draft, running, paused, completed, archived
    start_date DATE,
    end_date DATE,
    
    -- Results
    results JSONB DEFAULT '{}',
    winner_variant VARCHAR(50),
    confidence_level DECIMAL(3,2),
    statistical_significance BOOLEAN DEFAULT FALSE,
    
    created_by UUID, -- References users table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B test assignments
CREATE TABLE ab_test_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    variant VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(experiment_id, user_id)
);

-- A/B test events
CREATE TABLE ab_test_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES ab_test_assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    variant VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_value DECIMAL(15,4),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for ab_test_events
CREATE TABLE ab_test_events_2024_01 PARTITION OF ab_test_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE ab_test_events_2024_02 PARTITION OF ab_test_events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- ============================================================================
-- REPORTS AND DASHBOARDS
-- ============================================================================

-- Saved reports
CREATE TABLE saved_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    report_type report_type NOT NULL,
    description TEXT,
    
    -- Report configuration
    query_config JSONB NOT NULL,
    filters JSONB DEFAULT '{}',
    dimensions TEXT[] DEFAULT '{}',
    metrics TEXT[] DEFAULT '{}',
    
    -- Scheduling
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_config JSONB DEFAULT '{}', -- cron expression, recipients, etc.
    
    -- Ownership and sharing
    created_by UUID NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    shared_with UUID[] DEFAULT '{}',
    
    -- Metadata
    last_generated_at TIMESTAMP WITH TIME ZONE,
    generation_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report generations/executions
CREATE TABLE report_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, generating, completed, failed
    
    -- Generation details
    generated_by UUID,
    file_path TEXT,
    file_size_bytes BIGINT,
    format VARCHAR(20), -- json, csv, xlsx, pdf
    
    -- Performance metrics
    generation_time_ms INTEGER,
    row_count INTEGER,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Dashboard configurations
CREATE TABLE dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Layout and widgets
    layout JSONB NOT NULL,
    widgets JSONB NOT NULL,
    
    -- Access control
    created_by UUID NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    shared_with UUID[] DEFAULT '{}',
    
    -- Settings
    auto_refresh_interval INTEGER DEFAULT 300, -- seconds
    theme VARCHAR(20) DEFAULT 'light',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- MACHINE LEARNING MODELS
-- ============================================================================

-- ML model metadata and versions
CREATE TABLE ml_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    model_type VARCHAR(100) NOT NULL, -- recommendation, churn_prediction, etc.
    version VARCHAR(50) NOT NULL,
    
    -- Model details
    algorithm VARCHAR(100),
    hyperparameters JSONB DEFAULT '{}',
    features JSONB DEFAULT '{}',
    
    -- Performance metrics
    training_metrics JSONB DEFAULT '{}',
    validation_metrics JSONB DEFAULT '{}',
    
    -- Deployment
    status VARCHAR(20) DEFAULT 'training', -- training, trained, deployed, archived
    deployed_at TIMESTAMP WITH TIME ZONE,
    
    -- File paths
    model_file_path TEXT,
    artifacts_path TEXT,
    
    -- Training metadata
    training_data_size BIGINT,
    training_duration_seconds INTEGER,
    trained_by UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(name, version)
);

-- Model predictions and inference logs
CREATE TABLE model_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID NOT NULL REFERENCES ml_models(id),
    user_id UUID,
    entity_id UUID,
    
    -- Prediction details
    input_features JSONB NOT NULL,
    prediction_output JSONB NOT NULL,
    confidence_score DECIMAL(5,4),
    
    -- Performance
    inference_time_ms INTEGER,
    
    -- Feedback (for model improvement)
    actual_outcome JSONB,
    feedback_received_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for model_predictions
CREATE TABLE model_predictions_2024_01 PARTITION OF model_predictions
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE model_predictions_2024_02 PARTITION OF model_predictions
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- ============================================================================
-- PERFORMANCE AND MONITORING
-- ============================================================================

-- API performance metrics
CREATE TABLE api_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(100) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    
    -- Performance metrics
    response_time_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    
    -- Request details
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    
    -- Error details (if applicable)
    error_type VARCHAR(100),
    error_message TEXT,
    stack_trace TEXT,
    
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

-- Create daily partitions for api_metrics (high volume)
CREATE TABLE api_metrics_2024_01_01 PARTITION OF api_metrics
    FOR VALUES FROM ('2024-01-01') TO ('2024-01-02');

CREATE TABLE api_metrics_2024_01_02 PARTITION OF api_metrics
    FOR VALUES FROM ('2024-01-02') TO ('2024-01-03');

-- System health metrics
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    unit VARCHAR(20),
    
    -- Dimensions
    dimensions JSONB DEFAULT '{}',
    
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- For time-series aggregation
    UNIQUE(service_name, metric_name, dimensions, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create hourly partitions for system_metrics
CREATE TABLE system_metrics_2024_01_01_00 PARTITION OF system_metrics
    FOR VALUES FROM ('2024-01-01 00:00:00') TO ('2024-01-01 01:00:00');

-- ============================================================================
-- INDEXES FOR ANALYTICS SCHEMA
-- ============================================================================

-- Analytics events indexes (on parent table and partitions)
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_entity_id ON analytics_events(entity_id);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX idx_analytics_events_country ON analytics_events(country);
CREATE INDEX idx_analytics_events_utm_source ON analytics_events(utm_source);

-- GIN indexes for JSONB columns
CREATE INDEX idx_analytics_events_properties ON analytics_events USING GIN(properties);

-- Metric summaries indexes
CREATE INDEX idx_metric_summaries_metric_name ON metric_summaries(metric_name);
CREATE INDEX idx_metric_summaries_date ON metric_summaries(date);
CREATE INDEX idx_metric_summaries_granularity ON metric_summaries(granularity);
CREATE INDEX idx_metric_summaries_dimensions ON metric_summaries USING GIN(dimensions);

-- User segments indexes
CREATE INDEX idx_user_segments_user_id ON user_segments(user_id);
CREATE INDEX idx_user_segments_segment ON user_segments(segment);
CREATE INDEX idx_user_segments_assigned_at ON user_segments(assigned_at);
CREATE INDEX idx_user_segments_expires_at ON user_segments(expires_at);

-- Recommendation logs indexes
CREATE INDEX idx_recommendation_logs_user_id ON recommendation_logs(user_id);
CREATE INDEX idx_recommendation_logs_algorithm ON recommendation_logs(algorithm_used);
CREATE INDEX idx_recommendation_logs_created_at ON recommendation_logs(created_at);

-- A/B testing indexes
CREATE INDEX idx_ab_experiments_status ON ab_experiments(status);
CREATE INDEX idx_ab_test_assignments_experiment_id ON ab_test_assignments(experiment_id);
CREATE INDEX idx_ab_test_assignments_user_id ON ab_test_assignments(user_id);
CREATE INDEX idx_ab_test_events_experiment_id ON ab_test_events(experiment_id);
CREATE INDEX idx_ab_test_events_user_id ON ab_test_events(user_id);
CREATE INDEX idx_ab_test_events_created_at ON ab_test_events(created_at);

-- Reports indexes
CREATE INDEX idx_saved_reports_created_by ON saved_reports(created_by);
CREATE INDEX idx_saved_reports_report_type ON saved_reports(report_type);
CREATE INDEX idx_saved_reports_is_scheduled ON saved_reports(is_scheduled);
CREATE INDEX idx_report_generations_report_id ON report_generations(report_id);
CREATE INDEX idx_report_generations_status ON report_generations(status);

-- Dashboards indexes
CREATE INDEX idx_dashboards_created_by ON dashboards(created_by);
CREATE INDEX idx_dashboards_is_public ON dashboards(is_public);

-- ML models indexes
CREATE INDEX idx_ml_models_name ON ml_models(name);
CREATE INDEX idx_ml_models_model_type ON ml_models(model_type);
CREATE INDEX idx_ml_models_status ON ml_models(status);
CREATE INDEX idx_model_predictions_model_id ON model_predictions(model_id);
CREATE INDEX idx_model_predictions_user_id ON model_predictions(user_id);

-- Performance monitoring indexes
CREATE INDEX idx_api_metrics_service_endpoint ON api_metrics(service_name, endpoint);
CREATE INDEX idx_api_metrics_timestamp ON api_metrics(timestamp);
CREATE INDEX idx_api_metrics_status_code ON api_metrics(status_code);
CREATE INDEX idx_system_metrics_service_metric ON system_metrics(service_name, metric_name);
CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to automatically create new monthly partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(
    table_name TEXT,
    start_date DATE
) RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || TO_CHAR(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- Function to update metric summaries
CREATE OR REPLACE FUNCTION update_metric_summary(
    p_metric_name VARCHAR(100),
    p_metric_type metric_type,
    p_dimensions JSONB,
    p_value DECIMAL(15,4),
    p_date DATE,
    p_granularity time_granularity
) RETURNS VOID AS $$
BEGIN
    INSERT INTO metric_summaries (metric_name, metric_type, dimensions, value, date, granularity)
    VALUES (p_metric_name, p_metric_type, p_dimensions, p_value, p_date, p_granularity)
    ON CONFLICT (metric_name, dimensions, date, granularity)
    DO UPDATE SET
        value = p_value,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;