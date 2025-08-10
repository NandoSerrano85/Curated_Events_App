package models

import (
	"time"

	"github.com/google/uuid"
)

type Event struct {
	ID               uuid.UUID    `json:"id" db:"id"`
	Title            string       `json:"title" db:"title"`
	Description      string       `json:"description" db:"description"`
	ShortDescription *string      `json:"short_description" db:"short_description"`
	Category         string       `json:"category" db:"category"`
	Tags             []string     `json:"tags" db:"tags"`
	OrganizerID      uuid.UUID    `json:"organizer_id" db:"organizer_id"`
	OrganizerName    string       `json:"organizer_name" db:"organizer_name"`
	VenueID          *uuid.UUID   `json:"venue_id" db:"venue_id"`
	VenueName        *string      `json:"venue_name" db:"venue_name"`
	VenueAddress     *string      `json:"venue_address" db:"venue_address"`
	IsVirtual        bool         `json:"is_virtual" db:"is_virtual"`
	VirtualURL       *string      `json:"virtual_url" db:"virtual_url"`
	StartTime        time.Time    `json:"start_time" db:"start_time"`
	EndTime          time.Time    `json:"end_time" db:"end_time"`
	Timezone         string       `json:"timezone" db:"timezone"`
	IsPaid           bool         `json:"is_paid" db:"is_paid"`
	Price            *float64     `json:"price" db:"price"`
	Currency         string       `json:"currency" db:"currency"`
	MaxCapacity      *int         `json:"max_capacity" db:"max_capacity"`
	CurrentCapacity  int          `json:"current_capacity" db:"current_capacity"`
	RegistrationFee  *float64     `json:"registration_fee" db:"registration_fee"`
	Images           []string     `json:"images" db:"images"`
	Status           EventStatus  `json:"status" db:"status"`
	IsPublished      bool         `json:"is_published" db:"is_published"`
	IsFeatured       bool         `json:"is_featured" db:"is_featured"`
	CurationScore    *float64     `json:"curation_score" db:"curation_score"`
	CreatedAt        time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time    `json:"updated_at" db:"updated_at"`
	PublishedAt      *time.Time   `json:"published_at" db:"published_at"`
	
	// Computed fields
	IsRegistered     bool         `json:"is_registered,omitempty"`
	CanRegister      bool         `json:"can_register,omitempty"`
	SpotsRemaining   *int         `json:"spots_remaining,omitempty"`
}

type EventStatus string

const (
	EventStatusDraft     EventStatus = "draft"
	EventStatusPublished EventStatus = "published"
	EventStatusCancelled EventStatus = "cancelled"
	EventStatusCompleted EventStatus = "completed"
)

type CreateEventRequest struct {
	Title            string     `json:"title" binding:"required,max=200"`
	Description      string     `json:"description" binding:"required,max=5000"`
	ShortDescription *string    `json:"short_description" binding:"max=500"`
	Category         string     `json:"category" binding:"required"`
	Tags             []string   `json:"tags"`
	VenueID          *uuid.UUID `json:"venue_id"`
	VenueName        *string    `json:"venue_name"`
	VenueAddress     *string    `json:"venue_address"`
	IsVirtual        bool       `json:"is_virtual"`
	VirtualURL       *string    `json:"virtual_url"`
	StartTime        time.Time  `json:"start_time" binding:"required"`
	EndTime          time.Time  `json:"end_time" binding:"required"`
	Timezone         string     `json:"timezone" binding:"required"`
	IsPaid           bool       `json:"is_paid"`
	Price            *float64   `json:"price"`
	Currency         string     `json:"currency"`
	MaxCapacity      *int       `json:"max_capacity"`
	RegistrationFee  *float64   `json:"registration_fee"`
	Images           []string   `json:"images"`
}

type UpdateEventRequest struct {
	Title            *string    `json:"title" binding:"max=200"`
	Description      *string    `json:"description" binding:"max=5000"`
	ShortDescription *string    `json:"short_description" binding:"max=500"`
	Category         *string    `json:"category"`
	Tags             []string   `json:"tags"`
	VenueID          *uuid.UUID `json:"venue_id"`
	VenueName        *string    `json:"venue_name"`
	VenueAddress     *string    `json:"venue_address"`
	IsVirtual        *bool      `json:"is_virtual"`
	VirtualURL       *string    `json:"virtual_url"`
	StartTime        *time.Time `json:"start_time"`
	EndTime          *time.Time `json:"end_time"`
	Timezone         *string    `json:"timezone"`
	IsPaid           *bool      `json:"is_paid"`
	Price            *float64   `json:"price"`
	Currency         *string    `json:"currency"`
	MaxCapacity      *int       `json:"max_capacity"`
	RegistrationFee  *float64   `json:"registration_fee"`
	Images           []string   `json:"images"`
}

type EventFilters struct {
	Category        *string     `json:"category"`
	Tags            []string    `json:"tags"`
	Location        *string     `json:"location"`
	MinPrice        *float64    `json:"min_price"`
	MaxPrice        *float64    `json:"max_price"`
	StartDate       *time.Time  `json:"start_date"`
	EndDate         *time.Time  `json:"end_date"`
	IsVirtual       *bool       `json:"is_virtual"`
	IsFree          *bool       `json:"is_free"`
	HasAvailableSpots *bool     `json:"has_available_spots"`
	OrganizerID     *uuid.UUID  `json:"organizer_id"`
	Featured        *bool       `json:"featured"`
	Status          *EventStatus `json:"status"`
	
	// Pagination
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
	
	// Sorting
	SortBy    string `json:"sort_by"`    // "start_time", "created_at", "price", "popularity"
	SortOrder string `json:"sort_order"` // "asc", "desc"
}

type EventRegistration struct {
	ID          uuid.UUID            `json:"id" db:"id"`
	EventID     uuid.UUID            `json:"event_id" db:"event_id"`
	UserID      uuid.UUID            `json:"user_id" db:"user_id"`
	UserName    string               `json:"user_name" db:"user_name"`
	UserEmail   string               `json:"user_email" db:"user_email"`
	Status      RegistrationStatus   `json:"status" db:"status"`
	PaymentID   *uuid.UUID           `json:"payment_id" db:"payment_id"`
	PaymentStatus *string            `json:"payment_status" db:"payment_status"`
	Metadata    map[string]interface{} `json:"metadata" db:"metadata"`
	CreatedAt   time.Time            `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time            `json:"updated_at" db:"updated_at"`
}

type RegistrationStatus string

const (
	RegistrationStatusPending   RegistrationStatus = "pending"
	RegistrationStatusConfirmed RegistrationStatus = "confirmed"
	RegistrationStatusCancelled RegistrationStatus = "cancelled"
	RegistrationStatusWaitlist  RegistrationStatus = "waitlist"
)

type RegisterEventRequest struct {
	EventID  uuid.UUID              `json:"event_id" binding:"required"`
	Metadata map[string]interface{} `json:"metadata"`
}

type EventStats struct {
	EventID            uuid.UUID `json:"event_id" db:"event_id"`
	TotalRegistrations int       `json:"total_registrations" db:"total_registrations"`
	ConfirmedRegistrations int   `json:"confirmed_registrations" db:"confirmed_registrations"`
	WaitlistRegistrations  int   `json:"waitlist_registrations" db:"waitlist_registrations"`
	TotalRevenue       float64   `json:"total_revenue" db:"total_revenue"`
	ViewCount          int       `json:"view_count" db:"view_count"`
	ShareCount         int       `json:"share_count" db:"share_count"`
	UpdatedAt          time.Time `json:"updated_at" db:"updated_at"`
}

type EventListResponse struct {
	Events     []Event `json:"events"`
	Total      int     `json:"total"`
	Page       int     `json:"page"`
	PageSize   int     `json:"page_size"`
	TotalPages int     `json:"total_pages"`
}