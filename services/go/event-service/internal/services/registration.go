package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"events-platform/services/go/event-service/internal/database"
	"events-platform/services/go/event-service/internal/models"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
	"go.uber.org/zap"
)

var (
	ErrAlreadyRegistered = errors.New("already registered for this event")
	ErrRegistrationClosed = errors.New("registration is closed")
	ErrNotRegistered = errors.New("not registered for this event")
)

type RegistrationService struct {
	db     *sql.DB
	redis  *redis.Client
	nats   *nats.Conn
	logger *zap.Logger
}

func NewRegistrationService(db *sql.DB, redis *redis.Client, nats *nats.Conn, logger *zap.Logger) *RegistrationService {
	return &RegistrationService{
		db:     db,
		redis:  redis,
		nats:   nats,
		logger: logger,
	}
}

func (s *RegistrationService) RegisterForEvent(ctx context.Context, req *models.RegisterEventRequest, userID uuid.UUID, userName, userEmail string) (*models.EventRegistration, error) {
	// Check if event exists and is available for registration
	event, err := s.getEventForRegistration(ctx, req.EventID)
	if err != nil {
		return nil, err
	}

	if !event.IsPublished || event.Status != models.EventStatusPublished {
		return nil, ErrEventNotPublished
	}

	if event.StartTime.Before(time.Now()) {
		return nil, ErrEventInPast
	}

	// Check if already registered
	existing, err := s.getRegistration(ctx, req.EventID, userID)
	if err == nil {
		if existing.Status == models.RegistrationStatusConfirmed || existing.Status == models.RegistrationStatusPending {
			return nil, ErrAlreadyRegistered
		}
	}

	// Check capacity
	registrationStatus := models.RegistrationStatusConfirmed
	if event.MaxCapacity != nil && event.CurrentCapacity >= *event.MaxCapacity {
		registrationStatus = models.RegistrationStatusWaitlist
	}

	// Create registration
	registration := &models.EventRegistration{
		ID:        uuid.New(),
		EventID:   req.EventID,
		UserID:    userID,
		UserName:  userName,
		UserEmail: userEmail,
		Status:    registrationStatus,
		Metadata:  req.Metadata,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Insert registration
	query := `
		INSERT INTO event_registrations (
			id, event_id, user_id, user_name, user_email, status, metadata
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (event_id, user_id) 
		DO UPDATE SET 
			status = EXCLUDED.status,
			metadata = EXCLUDED.metadata,
			updated_at = NOW()
		RETURNING created_at, updated_at
	`

	metadataJSON, _ := json.Marshal(registration.Metadata)
	err = tx.QueryRowContext(ctx, query,
		registration.ID, registration.EventID, registration.UserID,
		registration.UserName, registration.UserEmail, registration.Status,
		metadataJSON,
	).Scan(&registration.CreatedAt, &registration.UpdatedAt)

	if err != nil {
		return nil, err
	}

	// Update event stats
	statsQuery := `
		UPDATE event_stats SET
			total_registrations = total_registrations + 1,
			confirmed_registrations = CASE 
				WHEN $2 = 'confirmed' THEN confirmed_registrations + 1 
				ELSE confirmed_registrations 
			END,
			waitlist_registrations = CASE 
				WHEN $2 = 'waitlist' THEN waitlist_registrations + 1 
				ELSE waitlist_registrations 
			END,
			updated_at = NOW()
		WHERE event_id = $1
	`
	_, err = tx.ExecContext(ctx, statsQuery, req.EventID, registration.Status)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	// Cache the registration
	s.cacheRegistration(ctx, registration)

	// Update user registrations cache
	s.updateUserRegistrationsCache(ctx, userID, registration)

	// Publish registration message
	msg := database.EventRegistrationMessage{
		EventID:        req.EventID.String(),
		UserID:         userID.String(),
		RegistrationID: registration.ID.String(),
		Status:         string(registration.Status),
		Timestamp:      time.Now(),
	}
	database.PublishMessage(s.nats, database.EventRegistrationSubject, msg)

	// Publish capacity update if confirmed
	if registration.Status == models.RegistrationStatusConfirmed {
		capacityMsg := database.EventCapacityMessage{
			EventID:         req.EventID.String(),
			CurrentCapacity: event.CurrentCapacity + 1,
			MaxCapacity:     event.MaxCapacity,
			Timestamp:       time.Now(),
		}
		database.PublishMessage(s.nats, database.EventCapacityUpdatedSubject, capacityMsg)
	}

	s.logger.Info("User registered for event",
		zap.String("user_id", userID.String()),
		zap.String("event_id", req.EventID.String()),
		zap.String("status", string(registration.Status)))

	return registration, nil
}

func (s *RegistrationService) CancelRegistration(ctx context.Context, eventID, userID uuid.UUID) error {
	// Get current registration
	registration, err := s.getRegistration(ctx, eventID, userID)
	if err != nil {
		return ErrNotRegistered
	}

	if registration.Status == models.RegistrationStatusCancelled {
		return ErrNotRegistered
	}

	// Check if event allows cancellation (e.g., not too close to start time)
	event, err := s.getEventForRegistration(ctx, eventID)
	if err != nil {
		return err
	}

	// Allow cancellation up to 24 hours before event
	if event.StartTime.Sub(time.Now()) < 24*time.Hour {
		return errors.New("cancellation not allowed within 24 hours of event start")
	}

	wasConfirmed := registration.Status == models.RegistrationStatusConfirmed

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Update registration status
	query := `
		UPDATE event_registrations 
		SET status = 'cancelled', updated_at = NOW()
		WHERE event_id = $1 AND user_id = $2
	`
	_, err = tx.ExecContext(ctx, query, eventID, userID)
	if err != nil {
		return err
	}

	// Update event stats
	statsQuery := `
		UPDATE event_stats SET
			total_registrations = total_registrations - 1,
			confirmed_registrations = CASE 
				WHEN $2 = true THEN confirmed_registrations - 1 
				ELSE confirmed_registrations 
			END,
			updated_at = NOW()
		WHERE event_id = $1
	`
	_, err = tx.ExecContext(ctx, statsQuery, eventID, wasConfirmed)
	if err != nil {
		return err
	}

	// If there's a waitlist, promote the next person
	if wasConfirmed {
		promoteQuery := `
			UPDATE event_registrations 
			SET status = 'confirmed', updated_at = NOW()
			WHERE event_id = $1 AND status = 'waitlist'
			ORDER BY created_at ASC
			LIMIT 1
			RETURNING id, user_id, user_name, user_email
		`
		
		var promotedID, promotedUserID uuid.UUID
		var promotedUserName, promotedUserEmail string
		err = tx.QueryRowContext(ctx, promoteQuery, eventID).Scan(
			&promotedID, &promotedUserID, &promotedUserName, &promotedUserEmail,
		)
		
		if err == nil {
			// Someone was promoted from waitlist
			s.logger.Info("User promoted from waitlist",
				zap.String("user_id", promotedUserID.String()),
				zap.String("event_id", eventID.String()))

			// Send notification about promotion (async)
			go func() {
				promoteMsg := database.EventRegistrationMessage{
					EventID:        eventID.String(),
					UserID:         promotedUserID.String(),
					RegistrationID: promotedID.String(),
					Status:         "confirmed",
					Timestamp:      time.Now(),
				}
				database.PublishMessage(s.nats, database.EventRegistrationSubject, promoteMsg)
			}()
		}
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	// Clear caches
	s.clearRegistrationCaches(ctx, eventID, userID)

	// Publish cancellation message
	msg := database.EventRegistrationMessage{
		EventID:        eventID.String(),
		UserID:         userID.String(),
		RegistrationID: registration.ID.String(),
		Status:         "cancelled",
		Timestamp:      time.Now(),
	}
	database.PublishMessage(s.nats, database.EventUnregistrationSubject, msg)

	// Publish capacity update if was confirmed
	if wasConfirmed {
		capacityMsg := database.EventCapacityMessage{
			EventID:         eventID.String(),
			CurrentCapacity: event.CurrentCapacity - 1,
			MaxCapacity:     event.MaxCapacity,
			Timestamp:       time.Now(),
		}
		database.PublishMessage(s.nats, database.EventCapacityUpdatedSubject, capacityMsg)
	}

	s.logger.Info("User cancelled registration",
		zap.String("user_id", userID.String()),
		zap.String("event_id", eventID.String()))

	return nil
}

func (s *RegistrationService) GetUserRegistrations(ctx context.Context, userID uuid.UUID, status *models.RegistrationStatus) ([]models.EventRegistration, error) {
	// Try cache first
	if cached, err := s.getUserRegistrationsFromCache(ctx, userID); err == nil && status == nil {
		return cached, nil
	}

	query := `
		SELECT r.id, r.event_id, r.user_id, r.user_name, r.user_email,
		       r.status, r.payment_id, r.payment_status, r.metadata,
		       r.created_at, r.updated_at
		FROM event_registrations r
		WHERE r.user_id = $1
	`
	
	args := []interface{}{userID}
	if status != nil {
		query += " AND r.status = $2"
		args = append(args, *status)
	}
	
	query += " ORDER BY r.created_at DESC"

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	registrations := []models.EventRegistration{}
	for rows.Next() {
		reg := models.EventRegistration{}
		var metadataJSON sql.NullString
		
		err := rows.Scan(
			&reg.ID, &reg.EventID, &reg.UserID, &reg.UserName, &reg.UserEmail,
			&reg.Status, &reg.PaymentID, &reg.PaymentStatus, &metadataJSON,
			&reg.CreatedAt, &reg.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if metadataJSON.Valid {
			json.Unmarshal([]byte(metadataJSON.String), &reg.Metadata)
		}

		registrations = append(registrations, reg)
	}

	// Cache if no status filter
	if status == nil {
		s.cacheUserRegistrations(ctx, userID, registrations)
	}

	return registrations, nil
}

func (s *RegistrationService) GetEventRegistrations(ctx context.Context, eventID uuid.UUID, organizerID uuid.UUID) ([]models.EventRegistration, error) {
	// Verify ownership
	event, err := s.getEventForRegistration(ctx, eventID)
	if err != nil {
		return nil, err
	}

	if event.OrganizerID != organizerID {
		return nil, ErrUnauthorized
	}

	query := `
		SELECT r.id, r.event_id, r.user_id, r.user_name, r.user_email,
		       r.status, r.payment_id, r.payment_status, r.metadata,
		       r.created_at, r.updated_at
		FROM event_registrations r
		WHERE r.event_id = $1
		ORDER BY r.created_at DESC
	`

	rows, err := s.db.QueryContext(ctx, query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	registrations := []models.EventRegistration{}
	for rows.Next() {
		reg := models.EventRegistration{}
		var metadataJSON sql.NullString
		
		err := rows.Scan(
			&reg.ID, &reg.EventID, &reg.UserID, &reg.UserName, &reg.UserEmail,
			&reg.Status, &reg.PaymentID, &reg.PaymentStatus, &metadataJSON,
			&reg.CreatedAt, &reg.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if metadataJSON.Valid {
			json.Unmarshal([]byte(metadataJSON.String), &reg.Metadata)
		}

		registrations = append(registrations, reg)
	}

	return registrations, nil
}

func (s *RegistrationService) UpdatePaymentStatus(ctx context.Context, registrationID uuid.UUID, paymentID uuid.UUID, paymentStatus string) error {
	query := `
		UPDATE event_registrations 
		SET payment_id = $2, payment_status = $3, updated_at = NOW()
		WHERE id = $1
	`
	_, err := s.db.ExecContext(ctx, query, registrationID, paymentID, paymentStatus)
	if err != nil {
		return err
	}

	// Clear relevant caches
	registration, err := s.getRegistrationByID(ctx, registrationID)
	if err == nil {
		s.clearRegistrationCaches(ctx, registration.EventID, registration.UserID)
	}

	return nil
}

// Helper methods

func (s *RegistrationService) getEventForRegistration(ctx context.Context, eventID uuid.UUID) (*models.Event, error) {
	event := &models.Event{}
	query := `
		SELECT id, organizer_id, start_time, status, is_published, 
		       max_capacity, current_capacity
		FROM events 
		WHERE id = $1
	`
	err := s.db.QueryRowContext(ctx, query, eventID).Scan(
		&event.ID, &event.OrganizerID, &event.StartTime, &event.Status,
		&event.IsPublished, &event.MaxCapacity, &event.CurrentCapacity,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrEventNotFound
		}
		return nil, err
	}
	return event, nil
}

func (s *RegistrationService) getRegistration(ctx context.Context, eventID, userID uuid.UUID) (*models.EventRegistration, error) {
	reg := &models.EventRegistration{}
	query := `
		SELECT id, event_id, user_id, user_name, user_email, status,
		       payment_id, payment_status, metadata, created_at, updated_at
		FROM event_registrations 
		WHERE event_id = $1 AND user_id = $2
	`
	
	var metadataJSON sql.NullString
	err := s.db.QueryRowContext(ctx, query, eventID, userID).Scan(
		&reg.ID, &reg.EventID, &reg.UserID, &reg.UserName, &reg.UserEmail,
		&reg.Status, &reg.PaymentID, &reg.PaymentStatus, &metadataJSON,
		&reg.CreatedAt, &reg.UpdatedAt,
	)
	
	if err != nil {
		return nil, err
	}

	if metadataJSON.Valid {
		json.Unmarshal([]byte(metadataJSON.String), &reg.Metadata)
	}

	return reg, nil
}

func (s *RegistrationService) getRegistrationByID(ctx context.Context, registrationID uuid.UUID) (*models.EventRegistration, error) {
	reg := &models.EventRegistration{}
	query := `
		SELECT id, event_id, user_id, user_name, user_email, status,
		       payment_id, payment_status, metadata, created_at, updated_at
		FROM event_registrations 
		WHERE id = $1
	`
	
	var metadataJSON sql.NullString
	err := s.db.QueryRowContext(ctx, query, registrationID).Scan(
		&reg.ID, &reg.EventID, &reg.UserID, &reg.UserName, &reg.UserEmail,
		&reg.Status, &reg.PaymentID, &reg.PaymentStatus, &metadataJSON,
		&reg.CreatedAt, &reg.UpdatedAt,
	)
	
	if err != nil {
		return nil, err
	}

	if metadataJSON.Valid {
		json.Unmarshal([]byte(metadataJSON.String), &reg.Metadata)
	}

	return reg, nil
}

func (s *RegistrationService) cacheRegistration(ctx context.Context, registration *models.EventRegistration) {
	key := database.EventRegistrationKey(registration.EventID.String(), registration.UserID.String())
	data, _ := json.Marshal(registration)
	s.redis.Set(ctx, key, data, time.Hour)
}

func (s *RegistrationService) cacheUserRegistrations(ctx context.Context, userID uuid.UUID, registrations []models.EventRegistration) {
	key := database.UserRegistrationsKey(userID.String())
	data, _ := json.Marshal(registrations)
	s.redis.Set(ctx, key, data, 30*time.Minute)
}

func (s *RegistrationService) getUserRegistrationsFromCache(ctx context.Context, userID uuid.UUID) ([]models.EventRegistration, error) {
	key := database.UserRegistrationsKey(userID.String())
	data, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		return nil, err
	}
	
	var registrations []models.EventRegistration
	err = json.Unmarshal([]byte(data), &registrations)
	return registrations, err
}

func (s *RegistrationService) updateUserRegistrationsCache(ctx context.Context, userID uuid.UUID, newReg *models.EventRegistration) {
	// Get current cached registrations
	cached, err := s.getUserRegistrationsFromCache(ctx, userID)
	if err != nil {
		return // Cache miss, will be populated on next request
	}

	// Add new registration to the front
	cached = append([]models.EventRegistration{*newReg}, cached...)

	// Re-cache
	s.cacheUserRegistrations(ctx, userID, cached)
}

func (s *RegistrationService) clearRegistrationCaches(ctx context.Context, eventID, userID uuid.UUID) {
	// Clear specific registration cache
	regKey := database.EventRegistrationKey(eventID.String(), userID.String())
	s.redis.Del(ctx, regKey)

	// Clear user registrations cache
	userKey := database.UserRegistrationsKey(userID.String())
	s.redis.Del(ctx, userKey)
}