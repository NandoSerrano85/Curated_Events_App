package services

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"events-platform/services/go/user-service/internal/models"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUserExists = errors.New("user already exists")
	ErrWeakPassword = errors.New("password does not meet requirements")
)

type UserService struct {
	db     *sql.DB
	redis  *redis.Client
	logger *zap.Logger
}

func NewUserService(db *sql.DB, redis *redis.Client, logger *zap.Logger) *UserService {
	return &UserService{
		db:     db,
		redis:  redis,
		logger: logger,
	}
}

func (s *UserService) CreateUser(ctx context.Context, req *models.CreateUserRequest) (*models.User, error) {
	// Validate password strength
	if len(req.Password) < 8 {
		return nil, ErrWeakPassword
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Create user
	userID := uuid.New()
	user := &models.User{
		ID:           userID,
		Email:        req.Email,
		Username:     req.Username,
		PasswordHash: string(hashedPassword),
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Insert user
	query := `
		INSERT INTO users (id, email, username, password_hash, first_name, last_name)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at, updated_at
	`
	err = tx.QueryRowContext(ctx, query, 
		user.ID, user.Email, user.Username, user.PasswordHash,
		user.FirstName, user.LastName,
	).Scan(&user.CreatedAt, &user.UpdatedAt)
	
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return nil, ErrUserExists
		}
		return nil, err
	}

	// Create default preferences
	preferencesID := uuid.New()
	prefQuery := `
		INSERT INTO user_preferences (id, user_id, email_notifications, push_notifications, event_reminders)
		VALUES ($1, $2, true, true, true)
	`
	_, err = tx.ExecContext(ctx, prefQuery, preferencesID, userID)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	user.PasswordHash = "" // Don't return password hash
	return user, nil
}

func (s *UserService) GetUserByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT u.id, u.email, u.username, u.first_name, u.last_name, 
		       u.profile_picture, u.bio, u.location, u.date_of_birth, 
		       u.is_email_verified, u.is_active, u.last_login_at, 
		       u.created_at, u.updated_at
		FROM users u
		WHERE u.id = $1 AND u.is_active = true
	`
	err := s.db.QueryRowContext(ctx, query, userID).Scan(
		&user.ID, &user.Email, &user.Username, &user.FirstName, &user.LastName,
		&user.ProfilePicture, &user.Bio, &user.Location, &user.DateOfBirth,
		&user.IsEmailVerified, &user.IsActive, &user.LastLoginAt,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Get preferences
	preferences, err := s.getUserPreferences(ctx, userID)
	if err == nil {
		user.Preferences = preferences
	}

	return user, nil
}

func (s *UserService) UpdateUser(ctx context.Context, userID uuid.UUID, req *models.UpdateUserRequest) (*models.User, error) {
	query := `
		UPDATE users SET 
			first_name = COALESCE($2, first_name),
			last_name = COALESCE($3, last_name),
			bio = COALESCE($4, bio),
			location = COALESCE($5, location),
			date_of_birth = COALESCE($6, date_of_birth),
			profile_picture = COALESCE($7, profile_picture),
			updated_at = NOW()
		WHERE id = $1 AND is_active = true
		RETURNING id, email, username, first_name, last_name, profile_picture, 
		          bio, location, date_of_birth, is_email_verified, is_active, 
		          last_login_at, created_at, updated_at
	`

	user := &models.User{}
	err := s.db.QueryRowContext(ctx, query, 
		userID, req.FirstName, req.LastName, req.Bio, 
		req.Location, req.DateOfBirth, req.ProfilePicture,
	).Scan(
		&user.ID, &user.Email, &user.Username, &user.FirstName, &user.LastName,
		&user.ProfilePicture, &user.Bio, &user.Location, &user.DateOfBirth,
		&user.IsEmailVerified, &user.IsActive, &user.LastLoginAt,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserService) ChangePassword(ctx context.Context, userID uuid.UUID, req *models.ChangePasswordRequest) error {
	// Get current password hash
	var currentHash string
	query := `SELECT password_hash FROM users WHERE id = $1 AND is_active = true`
	err := s.db.QueryRowContext(ctx, query, userID).Scan(&currentHash)
	if err != nil {
		return err
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(req.CurrentPassword)); err != nil {
		return ErrInvalidCredentials
	}

	// Hash new password
	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Update password
	updateQuery := `UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1`
	_, err = s.db.ExecContext(ctx, updateQuery, userID, string(newHash))
	return err
}

func (s *UserService) DeleteUser(ctx context.Context, userID uuid.UUID) error {
	// Soft delete - mark as inactive
	query := `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`
	_, err := s.db.ExecContext(ctx, query, userID)
	return err
}

func (s *UserService) GetUserPreferences(ctx context.Context, userID uuid.UUID) (*models.UserPreferences, error) {
	return s.getUserPreferences(ctx, userID)
}

func (s *UserService) UpdateUserPreferences(ctx context.Context, userID uuid.UUID, preferences *models.UserPreferences) (*models.UserPreferences, error) {
	query := `
		UPDATE user_preferences SET
			email_notifications = COALESCE($2, email_notifications),
			push_notifications = COALESCE($3, push_notifications),
			sms_notifications = COALESCE($4, sms_notifications),
			marketing_emails = COALESCE($5, marketing_emails),
			event_reminders = COALESCE($6, event_reminders),
			preferred_categories = COALESCE($7, preferred_categories),
			preferred_location = COALESCE($8, preferred_location),
			max_travel_distance = COALESCE($9, max_travel_distance),
			price_range_min = COALESCE($10, price_range_min),
			price_range_max = COALESCE($11, price_range_max),
			updated_at = NOW()
		WHERE user_id = $1
		RETURNING id, user_id, email_notifications, push_notifications, 
		          sms_notifications, marketing_emails, event_reminders,
		          preferred_categories, preferred_location, max_travel_distance,
		          price_range_min, price_range_max, created_at, updated_at
	`

	result := &models.UserPreferences{}
	err := s.db.QueryRowContext(ctx, query,
		userID, preferences.EmailNotifications, preferences.PushNotifications,
		preferences.SMSNotifications, preferences.MarketingEmails, preferences.EventReminders,
		pq.Array(preferences.PreferredCategories), preferences.PreferredLocation,
		preferences.MaxTravelDistance, preferences.PriceRangeMin, preferences.PriceRangeMax,
	).Scan(
		&result.ID, &result.UserID, &result.EmailNotifications, &result.PushNotifications,
		&result.SMSNotifications, &result.MarketingEmails, &result.EventReminders,
		pq.Array(&result.PreferredCategories), &result.PreferredLocation,
		&result.MaxTravelDistance, &result.PriceRangeMin, &result.PriceRangeMax,
		&result.CreatedAt, &result.UpdatedAt,
	)

	return result, err
}

func (s *UserService) getUserPreferences(ctx context.Context, userID uuid.UUID) (*models.UserPreferences, error) {
	preferences := &models.UserPreferences{}
	query := `
		SELECT id, user_id, email_notifications, push_notifications, 
		       sms_notifications, marketing_emails, event_reminders,
		       preferred_categories, preferred_location, max_travel_distance,
		       price_range_min, price_range_max, created_at, updated_at
		FROM user_preferences
		WHERE user_id = $1
	`
	err := s.db.QueryRowContext(ctx, query, userID).Scan(
		&preferences.ID, &preferences.UserID, &preferences.EmailNotifications,
		&preferences.PushNotifications, &preferences.SMSNotifications,
		&preferences.MarketingEmails, &preferences.EventReminders,
		pq.Array(&preferences.PreferredCategories), &preferences.PreferredLocation,
		&preferences.MaxTravelDistance, &preferences.PriceRangeMin, &preferences.PriceRangeMax,
		&preferences.CreatedAt, &preferences.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return preferences, nil
}