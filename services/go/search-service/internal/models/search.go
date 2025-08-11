package models

import (
	"time"

	"github.com/google/uuid"
)

type SearchRequest struct {
	Query       string                 `json:"query"`
	Filters     map[string]interface{} `json:"filters"`
	Sort        []SortField           `json:"sort"`
	Page        int                   `json:"page"`
	PageSize    int                   `json:"page_size"`
	Aggregations map[string]string     `json:"aggregations"`
	Highlight   bool                  `json:"highlight"`
}

type SortField struct {
	Field string `json:"field"`
	Order string `json:"order"` // "asc" or "desc"
}

type SearchResponse struct {
	Events        []EventSearchResult `json:"events"`
	Total         int                `json:"total"`
	Page          int                `json:"page"`
	PageSize      int                `json:"page_size"`
	TotalPages    int                `json:"total_pages"`
	Took          int                `json:"took"` // milliseconds
	Aggregations  map[string]interface{} `json:"aggregations,omitempty"`
	Suggestions   []string           `json:"suggestions,omitempty"`
}

type EventSearchResult struct {
	ID               string                 `json:"id"`
	Title            string                 `json:"title"`
	Description      string                 `json:"description"`
	ShortDescription string                 `json:"short_description"`
	Category         string                 `json:"category"`
	Tags             []string               `json:"tags"`
	OrganizerID      string                 `json:"organizer_id"`
	OrganizerName    string                 `json:"organizer_name"`
	VenueName        string                 `json:"venue_name"`
	VenueAddress     string                 `json:"venue_address"`
	IsVirtual        bool                   `json:"is_virtual"`
	StartTime        time.Time              `json:"start_time"`
	EndTime          time.Time              `json:"end_time"`
	IsPaid           bool                   `json:"is_paid"`
	Price            *float64               `json:"price"`
	Currency         string                 `json:"currency"`
	MaxCapacity      *int                   `json:"max_capacity"`
	CurrentCapacity  int                    `json:"current_capacity"`
	Images           []string               `json:"images"`
	IsFeatured       bool                   `json:"is_featured"`
	CurationScore    *float64               `json:"curation_score"`
	CreatedAt        time.Time              `json:"created_at"`
	Score            float64                `json:"_score"`
	Highlights       map[string][]string    `json:"highlights,omitempty"`
	
	// Computed fields
	SpotsRemaining   *int                   `json:"spots_remaining,omitempty"`
}

type AutocompleteRequest struct {
	Query    string `json:"query" binding:"required"`
	Field    string `json:"field"`          // title, description, tags, venue, organizer
	MaxItems int    `json:"max_items"`
}

type AutocompleteResponse struct {
	Suggestions []AutocompleteSuggestion `json:"suggestions"`
}

type AutocompleteSuggestion struct {
	Text  string  `json:"text"`
	Score float64 `json:"score"`
	Type  string  `json:"type"` // event, organizer, venue, tag
}

type AggregationRequest struct {
	Field   string `json:"field"`   // category, tags, price_range, date_range
	Size    int    `json:"size"`
	Filters map[string]interface{} `json:"filters"`
}

type FacetResponse struct {
	Categories    []FacetItem `json:"categories"`
	Tags          []FacetItem `json:"tags"`
	PriceRanges   []FacetItem `json:"price_ranges"`
	DateRanges    []FacetItem `json:"date_ranges"`
	Locations     []FacetItem `json:"locations"`
	EventTypes    []FacetItem `json:"event_types"` // virtual, in-person
}

type FacetItem struct {
	Key   string `json:"key"`
	Count int    `json:"count"`
}

type GeoSearchRequest struct {
	Query       string  `json:"query"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	Radius      string  `json:"radius"`      // e.g., "10km", "5mi"
	Unit        string  `json:"unit"`        // km, mi, m
	Sort        string  `json:"sort"`        // distance, relevance, date
	Page        int     `json:"page"`
	PageSize    int     `json:"page_size"`
}

type GeoSearchResponse struct {
	Events     []EventSearchResult `json:"events"`
	Total      int                `json:"total"`
	Page       int                `json:"page"`
	PageSize   int                `json:"page_size"`
	TotalPages int                `json:"total_pages"`
}

type SimilarEventsRequest struct {
	EventID     string   `json:"event_id" binding:"required"`
	Categories  []string `json:"categories"`
	Tags        []string `json:"tags"`
	MaxResults  int      `json:"max_results"`
}

type SearchAnalytics struct {
	QueryID      uuid.UUID `json:"query_id" db:"query_id"`
	UserID       *uuid.UUID `json:"user_id" db:"user_id"`
	Query        string    `json:"query" db:"query"`
	Filters      string    `json:"filters" db:"filters"`     // JSON string
	ResultsCount int       `json:"results_count" db:"results_count"`
	ClickedEventID *uuid.UUID `json:"clicked_event_id" db:"clicked_event_id"`
	ResponseTime int       `json:"response_time" db:"response_time"` // milliseconds
	IPAddress    string    `json:"ip_address" db:"ip_address"`
	UserAgent    string    `json:"user_agent" db:"user_agent"`
	Timestamp    time.Time `json:"timestamp" db:"timestamp"`
}


type GeoPoint struct {
	Lat float64 `json:"lat"`
	Lon float64 `json:"lon"`
}

type BulkIndexRequest struct {
	Events []EventDocument `json:"events"`
}

// Additional request/response models for SearchService
type AdvancedSearchRequest struct {
	Query             string     `json:"query"`
	Category          string     `json:"category"`
	IsVirtual         *bool      `json:"is_virtual"`
	IsFree            *bool      `json:"is_free"`
	DateRange         string     `json:"date_range"`
	PriceRange        string     `json:"price_range"`
	Tags              []string   `json:"tags"`
	SortBy            string     `json:"sort_by"`
	Size              int        `json:"size"`
	From              int        `json:"from"`
	Location          *GeoFilter `json:"location"`
	StartDate         *time.Time `json:"start_date"`
	EndDate           *time.Time `json:"end_date"`
	MinPrice          *float64   `json:"min_price"`
	MaxPrice          *float64   `json:"max_price"`
	HasAvailableSpots *bool      `json:"has_available_spots"`
	Featured          *bool      `json:"featured"`
}

type GeoFilter struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Radius    float64 `json:"radius"`
}

type SuggestionResponse struct {
	Suggestions []string `json:"suggestions"`
}

// Simple SearchRequest for the SearchService
type SimpleSearchRequest struct {
	Query      string   `json:"query"`
	Category   string   `json:"category"`
	IsVirtual  *bool    `json:"is_virtual"`
	IsFree     *bool    `json:"is_free"`
	DateRange  string   `json:"date_range"`
	PriceRange string   `json:"price_range"`
	Tags       []string `json:"tags"`
	SortBy     string   `json:"sort_by"`
	Size       int      `json:"size"`
	From       int      `json:"from"`
}

// Enhanced EventDocument with search score
type EventDocument struct {
	ID               string     `json:"id"`
	Title            string     `json:"title"`
	Description      string     `json:"description"`
	ShortDescription string     `json:"short_description"`
	Category         string     `json:"category"`
	Tags             []string   `json:"tags"`
	OrganizerID      string     `json:"organizer_id"`
	OrganizerName    string     `json:"organizer_name"`
	VenueName        string     `json:"venue_name"`
	VenueAddress     string     `json:"venue_address"`
	Location         GeoPoint   `json:"location,omitempty"`
	IsVirtual        bool       `json:"is_virtual"`
	VirtualURL       string     `json:"virtual_url,omitempty"`
	StartTime        time.Time  `json:"start_time"`
	EndTime          time.Time  `json:"end_time"`
	IsPaid           bool       `json:"is_paid"`
	Price            *float64   `json:"price"`
	Currency         string     `json:"currency"`
	MaxCapacity      *int       `json:"max_capacity"`
	CurrentCapacity  int        `json:"current_capacity"`
	Images           []string   `json:"images"`
	Status           string     `json:"status"`
	IsPublished      bool       `json:"is_published"`
	IsFeatured       bool       `json:"is_featured"`
	CurationScore    *float64   `json:"curation_score"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	PublishedAt      *time.Time `json:"published_at"`
	
	// Computed fields for search
	PriceRange       string  `json:"price_range"`       // "free", "0-25", "25-50", "50-100", "100+"
	DateRange        string  `json:"date_range"`        // "today", "this_week", "this_month", "later"
	AvailableSpots   int     `json:"available_spots"`
	PopularityScore  float64 `json:"popularity_score"`  // Based on registrations, views, etc.
	SearchText       string  `json:"search_text"`       // Combined searchable text
	SearchScore      *float64 `json:"search_score,omitempty"` // Search relevance score
}