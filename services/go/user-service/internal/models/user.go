package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID                uuid.UUID  `json:"id" db:"id"`
	Email             string     `json:"email" db:"email"`
	Username          string     `json:"username" db:"username"`
	PasswordHash      string     `json:"-" db:"password_hash"`
	FirstName         string     `json:"first_name" db:"first_name"`
	LastName          string     `json:"last_name" db:"last_name"`
	ProfilePicture    *string    `json:"profile_picture" db:"profile_picture"`
	Bio               *string    `json:"bio" db:"bio"`
	Location          *string    `json:"location" db:"location"`
	DateOfBirth       *time.Time `json:"date_of_birth" db:"date_of_birth"`
	IsEmailVerified   bool       `json:"is_email_verified" db:"is_email_verified"`
	IsActive          bool       `json:"is_active" db:"is_active"`
	LastLoginAt       *time.Time `json:"last_login_at" db:"last_login_at"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
	
	// Preferences
	Preferences *UserPreferences `json:"preferences,omitempty"`
}

type UserPreferences struct {
	ID                    uuid.UUID `json:"id" db:"id"`
	UserID                uuid.UUID `json:"user_id" db:"user_id"`
	EmailNotifications    bool      `json:"email_notifications" db:"email_notifications"`
	PushNotifications     bool      `json:"push_notifications" db:"push_notifications"`
	SMSNotifications      bool      `json:"sms_notifications" db:"sms_notifications"`
	MarketingEmails       bool      `json:"marketing_emails" db:"marketing_emails"`
	EventReminders        bool      `json:"event_reminders" db:"event_reminders"`
	PreferredCategories   []string  `json:"preferred_categories" db:"preferred_categories"`
	PreferredLocation     *string   `json:"preferred_location" db:"preferred_location"`
	MaxTravelDistance     *int      `json:"max_travel_distance" db:"max_travel_distance"`
	PriceRangeMin         *float64  `json:"price_range_min" db:"price_range_min"`
	PriceRangeMax         *float64  `json:"price_range_max" db:"price_range_max"`
	CreatedAt             time.Time `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time `json:"updated_at" db:"updated_at"`
}

type CreateUserRequest struct {
	Email     string `json:"email" binding:"required,email"`
	Username  string `json:"username" binding:"required,min=3,max=30"`
	Password  string `json:"password" binding:"required,min=8"`
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type UpdateUserRequest struct {
	FirstName      *string    `json:"first_name"`
	LastName       *string    `json:"last_name"`
	Bio            *string    `json:"bio"`
	Location       *string    `json:"location"`
	DateOfBirth    *time.Time `json:"date_of_birth"`
	ProfilePicture *string    `json:"profile_picture"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

type AuthResponse struct {
	User         *User  `json:"user"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type LoginAttempt struct {
	Email     string    `json:"email" db:"email"`
	IPAddress string    `json:"ip_address" db:"ip_address"`
	Success   bool      `json:"success" db:"success"`
	Timestamp time.Time `json:"timestamp" db:"timestamp"`
}