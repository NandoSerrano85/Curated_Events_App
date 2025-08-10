package database

import (
	"database/sql"
	"time"

	_ "github.com/lib/pq"
)

func Connect(databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, err
	}

	// Configure connection pool
	db.SetMaxOpenConns(30)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test the connection
	if err = db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

func CreateEventTables(db *sql.DB) error {
	queries := []string{
		`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
		
		`CREATE TABLE IF NOT EXISTS events (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			title VARCHAR(200) NOT NULL,
			description TEXT NOT NULL,
			short_description VARCHAR(500),
			category VARCHAR(100) NOT NULL,
			tags TEXT[],
			organizer_id UUID NOT NULL,
			organizer_name VARCHAR(255) NOT NULL,
			venue_id UUID,
			venue_name VARCHAR(255),
			venue_address TEXT,
			is_virtual BOOLEAN DEFAULT false,
			virtual_url TEXT,
			start_time TIMESTAMP WITH TIME ZONE NOT NULL,
			end_time TIMESTAMP WITH TIME ZONE NOT NULL,
			timezone VARCHAR(50) NOT NULL,
			is_paid BOOLEAN DEFAULT false,
			price DECIMAL(10,2),
			currency VARCHAR(3) DEFAULT 'USD',
			max_capacity INTEGER,
			current_capacity INTEGER DEFAULT 0,
			registration_fee DECIMAL(10,2),
			images TEXT[],
			status VARCHAR(20) DEFAULT 'draft',
			is_published BOOLEAN DEFAULT false,
			is_featured BOOLEAN DEFAULT false,
			curation_score DECIMAL(5,2),
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			published_at TIMESTAMP WITH TIME ZONE
		);`,

		`CREATE TABLE IF NOT EXISTS event_registrations (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			event_id UUID REFERENCES events(id) ON DELETE CASCADE,
			user_id UUID NOT NULL,
			user_name VARCHAR(255) NOT NULL,
			user_email VARCHAR(255) NOT NULL,
			status VARCHAR(20) DEFAULT 'pending',
			payment_id UUID,
			payment_status VARCHAR(20),
			metadata JSONB,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			UNIQUE(event_id, user_id)
		);`,

		`CREATE TABLE IF NOT EXISTS event_stats (
			event_id UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
			total_registrations INTEGER DEFAULT 0,
			confirmed_registrations INTEGER DEFAULT 0,
			waitlist_registrations INTEGER DEFAULT 0,
			total_revenue DECIMAL(12,2) DEFAULT 0,
			view_count INTEGER DEFAULT 0,
			share_count INTEGER DEFAULT 0,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS event_views (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			event_id UUID REFERENCES events(id) ON DELETE CASCADE,
			user_id UUID,
			ip_address INET,
			user_agent TEXT,
			referrer TEXT,
			viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		// Indexes for performance
		`CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);`,
		`CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);`,
		`CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);`,
		`CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);`,
		`CREATE INDEX IF NOT EXISTS idx_events_is_published ON events(is_published);`,
		`CREATE INDEX IF NOT EXISTS idx_events_is_featured ON events(is_featured);`,
		`CREATE INDEX IF NOT EXISTS idx_events_curation_score ON events(curation_score DESC NULLS LAST);`,
		`CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);`,
		`CREATE INDEX IF NOT EXISTS idx_events_location ON events USING GIN(to_tsvector('english', COALESCE(venue_name, '') || ' ' || COALESCE(venue_address, '')));`,
		`CREATE INDEX IF NOT EXISTS idx_events_tags ON events USING GIN(tags);`,
		`CREATE INDEX IF NOT EXISTS idx_events_price ON events(price) WHERE price IS NOT NULL;`,
		`CREATE INDEX IF NOT EXISTS idx_events_capacity ON events(current_capacity, max_capacity) WHERE max_capacity IS NOT NULL;`,
		
		`CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON event_registrations(event_id);`,
		`CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON event_registrations(user_id);`,
		`CREATE INDEX IF NOT EXISTS idx_registrations_status ON event_registrations(status);`,
		`CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON event_registrations(created_at);`,
		
		`CREATE INDEX IF NOT EXISTS idx_views_event_id ON event_views(event_id);`,
		`CREATE INDEX IF NOT EXISTS idx_views_user_id ON event_views(user_id);`,
		`CREATE INDEX IF NOT EXISTS idx_views_viewed_at ON event_views(viewed_at);`,

		// Triggers
		`CREATE OR REPLACE FUNCTION update_updated_at_column()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = NOW();
			RETURN NEW;
		END;
		$$ language 'plpgsql';`,

		`DROP TRIGGER IF EXISTS update_events_updated_at ON events;
		CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events 
		FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,

		`DROP TRIGGER IF EXISTS update_registrations_updated_at ON event_registrations;
		CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON event_registrations 
		FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,

		`DROP TRIGGER IF EXISTS update_stats_updated_at ON event_stats;
		CREATE TRIGGER update_stats_updated_at BEFORE UPDATE ON event_stats 
		FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,

		// Function to update event capacity
		`CREATE OR REPLACE FUNCTION update_event_capacity()
		RETURNS TRIGGER AS $$
		BEGIN
			IF TG_OP = 'INSERT' THEN
				UPDATE events 
				SET current_capacity = current_capacity + 1 
				WHERE id = NEW.event_id;
				RETURN NEW;
			ELSIF TG_OP = 'DELETE' THEN
				UPDATE events 
				SET current_capacity = current_capacity - 1 
				WHERE id = OLD.event_id;
				RETURN OLD;
			ELSIF TG_OP = 'UPDATE' THEN
				IF OLD.status != NEW.status THEN
					IF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
						UPDATE events 
						SET current_capacity = current_capacity - 1 
						WHERE id = NEW.event_id;
					ELSIF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
						UPDATE events 
						SET current_capacity = current_capacity + 1 
						WHERE id = NEW.event_id;
					END IF;
				END IF;
				RETURN NEW;
			END IF;
			RETURN NULL;
		END;
		$$ language 'plpgsql';`,

		`DROP TRIGGER IF EXISTS update_capacity_on_registration ON event_registrations;
		CREATE TRIGGER update_capacity_on_registration 
		AFTER INSERT OR UPDATE OF status OR DELETE ON event_registrations
		FOR EACH ROW EXECUTE FUNCTION update_event_capacity();`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return err
		}
	}

	return nil
}