-- Rollback events tables migration

-- Drop indexes
DROP INDEX IF EXISTS idx_events_category_start_time;
DROP INDEX IF EXISTS idx_events_status_visibility_start_time;
DROP INDEX IF EXISTS idx_event_reviews_event_rating;
DROP INDEX IF EXISTS idx_event_favorites_user_event;
DROP INDEX IF EXISTS idx_payments_created_at;
DROP INDEX IF EXISTS idx_payments_external_payment_id;
DROP INDEX IF EXISTS idx_payments_status;
DROP INDEX IF EXISTS idx_payments_event_id;
DROP INDEX IF EXISTS idx_payments_user_id;
DROP INDEX IF EXISTS idx_payments_registration_id;
DROP INDEX IF EXISTS idx_event_registrations_registered_at;
DROP INDEX IF EXISTS idx_event_registrations_status;
DROP INDEX IF EXISTS idx_event_registrations_user_id;
DROP INDEX IF EXISTS idx_event_registrations_event_id;
DROP INDEX IF EXISTS idx_events_tags;
DROP INDEX IF EXISTS idx_events_description_fts;
DROP INDEX IF EXISTS idx_events_title_fts;
DROP INDEX IF EXISTS idx_events_location;
DROP INDEX IF EXISTS idx_events_slug;
DROP INDEX IF EXISTS idx_events_created_at;
DROP INDEX IF EXISTS idx_events_published_at;
DROP INDEX IF EXISTS idx_events_venue_country;
DROP INDEX IF EXISTS idx_events_venue_city;
DROP INDEX IF EXISTS idx_events_is_free;
DROP INDEX IF EXISTS idx_events_is_virtual;
DROP INDEX IF EXISTS idx_events_end_time;
DROP INDEX IF EXISTS idx_events_start_time;
DROP INDEX IF EXISTS idx_events_visibility;
DROP INDEX IF EXISTS idx_events_status;
DROP INDEX IF EXISTS idx_events_category_id;
DROP INDEX IF EXISTS idx_events_organizer_id;

-- Drop tables
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS event_reviews;
DROP TABLE IF EXISTS event_favorites;
DROP TABLE IF EXISTS event_registrations;
DROP TABLE IF EXISTS event_ticket_types;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS event_categories;

-- Drop types
DROP TYPE IF EXISTS payment_status;
DROP TYPE IF EXISTS registration_status;
DROP TYPE IF EXISTS event_visibility;
DROP TYPE IF EXISTS event_status;