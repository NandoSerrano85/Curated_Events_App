package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"events-platform/services/go/event-service/internal/database"
	"events-platform/services/go/event-service/internal/models"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/nats-io/nats.go"
	"go.uber.org/zap"
)

var (
	ErrEventNotFound       = errors.New("event not found")
	ErrEventNotPublished   = errors.New("event not published")
	ErrEventCapacityFull   = errors.New("event capacity full")
	ErrInvalidEventStatus  = errors.New("invalid event status")
	ErrEventInPast         = errors.New("event is in the past")
	ErrUnauthorized        = errors.New("unauthorized")
)

type EventService struct {
	db     *sql.DB
	redis  *redis.Client
	nats   *nats.Conn
	logger *zap.Logger
}

func NewEventService(db *sql.DB, redis *redis.Client, nats *nats.Conn, logger *zap.Logger) *EventService {
	return &EventService{
		db:     db,
		redis:  redis,
		nats:   nats,
		logger: logger,
	}
}

func (s *EventService) CreateEvent(ctx context.Context, req *models.CreateEventRequest, organizerID uuid.UUID, organizerName string) (*models.Event, error) {
	// Validation
	if req.EndTime.Before(req.StartTime) {
		return nil, errors.New("end time must be after start time")
	}

	if req.StartTime.Before(time.Now()) {
		return nil, errors.New("start time must be in the future")
	}

	if req.IsPaid && (req.Price == nil || *req.Price <= 0) {
		return nil, errors.New("paid events must have a valid price")
	}

	if req.IsVirtual && req.VirtualURL == nil {
		return nil, errors.New("virtual events must have a virtual URL")
	}

	if !req.IsVirtual && req.VenueName == nil {
		return nil, errors.New("in-person events must have a venue name")
	}

	// Create event
	event := &models.Event{
		ID:               uuid.New(),
		Title:            req.Title,
		Description:      req.Description,
		ShortDescription: req.ShortDescription,
		Category:         req.Category,
		Tags:             req.Tags,
		OrganizerID:      organizerID,
		OrganizerName:    organizerName,
		VenueID:          req.VenueID,
		VenueName:        req.VenueName,
		VenueAddress:     req.VenueAddress,
		IsVirtual:        req.IsVirtual,
		VirtualURL:       req.VirtualURL,
		StartTime:        req.StartTime,
		EndTime:          req.EndTime,
		Timezone:         req.Timezone,
		IsPaid:           req.IsPaid,
		Price:            req.Price,
		Currency:         req.Currency,
		MaxCapacity:      req.MaxCapacity,
		CurrentCapacity:  0,
		RegistrationFee:  req.RegistrationFee,
		Images:           req.Images,
		Status:           models.EventStatusDraft,
		IsPublished:      false,
		IsFeatured:       false,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO events (
			id, title, description, short_description, category, tags,
			organizer_id, organizer_name, venue_id, venue_name, venue_address,
			is_virtual, virtual_url, start_time, end_time, timezone,
			is_paid, price, currency, max_capacity, registration_fee, images
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
			$17, $18, $19, $20, $21, $22
		) RETURNING created_at, updated_at
	`

	err = tx.QueryRowContext(ctx, query,
		event.ID, event.Title, event.Description, event.ShortDescription,
		event.Category, pq.Array(event.Tags), event.OrganizerID, event.OrganizerName,
		event.VenueID, event.VenueName, event.VenueAddress, event.IsVirtual,
		event.VirtualURL, event.StartTime, event.EndTime, event.Timezone,
		event.IsPaid, event.Price, event.Currency, event.MaxCapacity,
		event.RegistrationFee, pq.Array(event.Images),
	).Scan(&event.CreatedAt, &event.UpdatedAt)

	if err != nil {
		return nil, err
	}

	// Create initial stats record
	statsQuery := `INSERT INTO event_stats (event_id) VALUES ($1)`
	_, err = tx.ExecContext(ctx, statsQuery, event.ID)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	// Cache the event
	s.cacheEvent(ctx, event)

	// Publish event created message
	msg := database.EventCreatedMessage{
		EventID:     event.ID.String(),
		OrganizerID: organizerID.String(),
		Event:       s.eventToMap(event),
		Timestamp:   time.Now(),
	}
	database.PublishMessage(s.nats, database.EventCreatedSubject, msg)

	s.logger.Info("Event created",
		zap.String("event_id", event.ID.String()),
		zap.String("organizer_id", organizerID.String()))

	return event, nil
}

func (s *EventService) GetEventByID(ctx context.Context, eventID uuid.UUID, userID *uuid.UUID) (*models.Event, error) {
	// Try cache first
	if event, err := s.getEventFromCache(ctx, eventID.String()); err == nil {
		// Enhance with user-specific data
		if userID != nil {
			s.enhanceEventWithUserData(ctx, event, *userID)
		}
		
		// Increment view count asynchronously
		go s.incrementViewCount(context.Background(), eventID, userID)
		
		return event, nil
	}

	// Fetch from database
	event, err := s.getEventFromDB(ctx, eventID)
	if err != nil {
		return nil, err
	}

	// Cache the event
	s.cacheEvent(ctx, event)

	// Enhance with user-specific data
	if userID != nil {
		s.enhanceEventWithUserData(ctx, event, *userID)
	}

	// Increment view count asynchronously
	go s.incrementViewCount(context.Background(), eventID, userID)

	return event, nil
}

func (s *EventService) UpdateEvent(ctx context.Context, eventID, organizerID uuid.UUID, req *models.UpdateEventRequest) (*models.Event, error) {
	// Get current event to verify ownership
	currentEvent, err := s.getEventFromDB(ctx, eventID)
	if err != nil {
		return nil, err
	}

	if currentEvent.OrganizerID != organizerID {
		return nil, ErrUnauthorized
	}

	// Build dynamic update query
	setParts := []string{}
	args := []interface{}{}
	argCount := 1

	if req.Title != nil {
		setParts = append(setParts, fmt.Sprintf("title = $%d", argCount))
		args = append(args, *req.Title)
		argCount++
	}

	if req.Description != nil {
		setParts = append(setParts, fmt.Sprintf("description = $%d", argCount))
		args = append(args, *req.Description)
		argCount++
	}

	if req.ShortDescription != nil {
		setParts = append(setParts, fmt.Sprintf("short_description = $%d", argCount))
		args = append(args, req.ShortDescription)
		argCount++
	}

	if req.Category != nil {
		setParts = append(setParts, fmt.Sprintf("category = $%d", argCount))
		args = append(args, *req.Category)
		argCount++
	}

	if req.Tags != nil {
		setParts = append(setParts, fmt.Sprintf("tags = $%d", argCount))
		args = append(args, pq.Array(req.Tags))
		argCount++
	}

	// Add other fields...
	if req.StartTime != nil {
		setParts = append(setParts, fmt.Sprintf("start_time = $%d", argCount))
		args = append(args, *req.StartTime)
		argCount++
	}

	if req.EndTime != nil {
		setParts = append(setParts, fmt.Sprintf("end_time = $%d", argCount))
		args = append(args, *req.EndTime)
		argCount++
	}

	if req.Price != nil {
		setParts = append(setParts, fmt.Sprintf("price = $%d", argCount))
		args = append(args, req.Price)
		argCount++
	}

	if req.MaxCapacity != nil {
		setParts = append(setParts, fmt.Sprintf("max_capacity = $%d", argCount))
		args = append(args, req.MaxCapacity)
		argCount++
	}

	if len(setParts) == 0 {
		return currentEvent, nil // No updates
	}

	// Add updated_at
	setParts = append(setParts, fmt.Sprintf("updated_at = $%d", argCount))
	args = append(args, time.Now())
	argCount++

	// Add WHERE clause
	args = append(args, eventID)

	query := fmt.Sprintf(`
		UPDATE events SET %s
		WHERE id = $%d
		RETURNING id, title, description, short_description, category, tags,
		         organizer_id, organizer_name, venue_id, venue_name, venue_address,
		         is_virtual, virtual_url, start_time, end_time, timezone,
		         is_paid, price, currency, max_capacity, current_capacity,
		         registration_fee, images, status, is_published, is_featured,
		         curation_score, created_at, updated_at, published_at
	`, strings.Join(setParts, ", "), argCount)

	event := &models.Event{}
	err = s.db.QueryRowContext(ctx, query, args...).Scan(
		&event.ID, &event.Title, &event.Description, &event.ShortDescription,
		&event.Category, pq.Array(&event.Tags), &event.OrganizerID, &event.OrganizerName,
		&event.VenueID, &event.VenueName, &event.VenueAddress, &event.IsVirtual,
		&event.VirtualURL, &event.StartTime, &event.EndTime, &event.Timezone,
		&event.IsPaid, &event.Price, &event.Currency, &event.MaxCapacity,
		&event.CurrentCapacity, &event.RegistrationFee, pq.Array(&event.Images),
		&event.Status, &event.IsPublished, &event.IsFeatured, &event.CurationScore,
		&event.CreatedAt, &event.UpdatedAt, &event.PublishedAt,
	)

	if err != nil {
		return nil, err
	}

	// Update cache
	s.cacheEvent(ctx, event)

	// Clear related caches
	s.clearEventCaches(ctx, eventID.String())

	// Publish event updated message
	msg := database.EventCreatedMessage{
		EventID:     event.ID.String(),
		OrganizerID: organizerID.String(),
		Event:       s.eventToMap(event),
		Timestamp:   time.Now(),
	}
	database.PublishMessage(s.nats, database.EventUpdatedSubject, msg)

	return event, nil
}

func (s *EventService) DeleteEvent(ctx context.Context, eventID, organizerID uuid.UUID) error {
	// Verify ownership
	event, err := s.getEventFromDB(ctx, eventID)
	if err != nil {
		return err
	}

	if event.OrganizerID != organizerID {
		return ErrUnauthorized
	}

	// Soft delete
	query := `UPDATE events SET status = 'cancelled', updated_at = NOW() WHERE id = $1`
	_, err = s.db.ExecContext(ctx, query, eventID)
	if err != nil {
		return err
	}

	// Clear caches
	s.clearEventCaches(ctx, eventID.String())

	// Publish event deleted message
	msg := database.EventCreatedMessage{
		EventID:     eventID.String(),
		OrganizerID: organizerID.String(),
		Timestamp:   time.Now(),
	}
	database.PublishMessage(s.nats, database.EventDeletedSubject, msg)

	return nil
}

func (s *EventService) ListEvents(ctx context.Context, filters *models.EventFilters, userID *uuid.UUID) (*models.EventListResponse, error) {
	// Generate cache key
	cacheKey := s.generateListCacheKey(filters)
	
	// Try cache first
	if cached, err := s.getEventListFromCache(ctx, cacheKey); err == nil {
		// Enhance with user-specific data
		if userID != nil {
			for i := range cached.Events {
				s.enhanceEventWithUserData(ctx, &cached.Events[i], *userID)
			}
		}
		return cached, nil
	}

	// Build query
	query, args, err := s.buildListQuery(filters)
	if err != nil {
		return nil, err
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := []models.Event{}
	for rows.Next() {
		event := models.Event{}
		err := rows.Scan(
			&event.ID, &event.Title, &event.Description, &event.ShortDescription,
			&event.Category, pq.Array(&event.Tags), &event.OrganizerID, &event.OrganizerName,
			&event.VenueID, &event.VenueName, &event.VenueAddress, &event.IsVirtual,
			&event.VirtualURL, &event.StartTime, &event.EndTime, &event.Timezone,
			&event.IsPaid, &event.Price, &event.Currency, &event.MaxCapacity,
			&event.CurrentCapacity, &event.RegistrationFee, pq.Array(&event.Images),
			&event.Status, &event.IsPublished, &event.IsFeatured, &event.CurationScore,
			&event.CreatedAt, &event.UpdatedAt, &event.PublishedAt,
		)
		if err != nil {
			return nil, err
		}
		events = append(events, event)
	}

	// Get total count
	totalQuery, totalArgs := s.buildCountQuery(filters)
	var total int
	err = s.db.QueryRowContext(ctx, totalQuery, totalArgs...).Scan(&total)
	if err != nil {
		return nil, err
	}

	pageSize := filters.PageSize
	if pageSize <= 0 {
		pageSize = 20
	}

	response := &models.EventListResponse{
		Events:     events,
		Total:      total,
		Page:       filters.Page,
		PageSize:   pageSize,
		TotalPages: (total + pageSize - 1) / pageSize,
	}

	// Cache the response
	s.cacheEventList(ctx, cacheKey, response)

	// Enhance with user-specific data
	if userID != nil {
		for i := range response.Events {
			s.enhanceEventWithUserData(ctx, &response.Events[i], *userID)
		}
	}

	return response, nil
}

func (s *EventService) PublishEvent(ctx context.Context, eventID, organizerID uuid.UUID) error {
	event, err := s.getEventFromDB(ctx, eventID)
	if err != nil {
		return err
	}

	if event.OrganizerID != organizerID {
		return ErrUnauthorized
	}

	if event.Status != models.EventStatusDraft {
		return ErrInvalidEventStatus
	}

	now := time.Now()
	query := `
		UPDATE events 
		SET status = 'published', is_published = true, published_at = $1, updated_at = $1
		WHERE id = $2
	`
	_, err = s.db.ExecContext(ctx, query, now, eventID)
	if err != nil {
		return err
	}

	// Clear caches
	s.clearEventCaches(ctx, eventID.String())

	// Publish event published message
	msg := database.EventCreatedMessage{
		EventID:     eventID.String(),
		OrganizerID: organizerID.String(),
		Timestamp:   now,
	}
	database.PublishMessage(s.nats, database.EventPublishedSubject, msg)

	return nil
}

// Helper methods

func (s *EventService) getEventFromDB(ctx context.Context, eventID uuid.UUID) (*models.Event, error) {
	event := &models.Event{}
	query := `
		SELECT id, title, description, short_description, category, tags,
		       organizer_id, organizer_name, venue_id, venue_name, venue_address,
		       is_virtual, virtual_url, start_time, end_time, timezone,
		       is_paid, price, currency, max_capacity, current_capacity,
		       registration_fee, images, status, is_published, is_featured,
		       curation_score, created_at, updated_at, published_at
		FROM events 
		WHERE id = $1
	`
	err := s.db.QueryRowContext(ctx, query, eventID).Scan(
		&event.ID, &event.Title, &event.Description, &event.ShortDescription,
		&event.Category, pq.Array(&event.Tags), &event.OrganizerID, &event.OrganizerName,
		&event.VenueID, &event.VenueName, &event.VenueAddress, &event.IsVirtual,
		&event.VirtualURL, &event.StartTime, &event.EndTime, &event.Timezone,
		&event.IsPaid, &event.Price, &event.Currency, &event.MaxCapacity,
		&event.CurrentCapacity, &event.RegistrationFee, pq.Array(&event.Images),
		&event.Status, &event.IsPublished, &event.IsFeatured, &event.CurationScore,
		&event.CreatedAt, &event.UpdatedAt, &event.PublishedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrEventNotFound
		}
		return nil, err
	}
	return event, nil
}

func (s *EventService) cacheEvent(ctx context.Context, event *models.Event) {
	key := database.EventCacheKey(event.ID.String())
	data, _ := json.Marshal(event)
	s.redis.Set(ctx, key, data, 30*time.Minute)
}

func (s *EventService) getEventFromCache(ctx context.Context, eventID string) (*models.Event, error) {
	key := database.EventCacheKey(eventID)
	data, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		return nil, err
	}
	
	var event models.Event
	err = json.Unmarshal([]byte(data), &event)
	return &event, err
}

func (s *EventService) clearEventCaches(ctx context.Context, eventID string) {
	// Clear event cache
	s.redis.Del(ctx, database.EventCacheKey(eventID))
	
	// Clear related list caches (simplified - in production, you'd want more sophisticated cache invalidation)
	pattern := database.EventListCacheKeyPrefix + "*"
	keys, _ := s.redis.Keys(ctx, pattern).Result()
	if len(keys) > 0 {
		s.redis.Del(ctx, keys...)
	}
}

func (s *EventService) enhanceEventWithUserData(ctx context.Context, event *models.Event, userID uuid.UUID) {
	// Check if user is registered
	regKey := database.EventRegistrationKey(event.ID.String(), userID.String())
	exists, _ := s.redis.Exists(ctx, regKey).Result()
	event.IsRegistered = exists > 0

	// Calculate remaining spots
	if event.MaxCapacity != nil {
		remaining := *event.MaxCapacity - event.CurrentCapacity
		event.SpotsRemaining = &remaining
		event.CanRegister = remaining > 0 && !event.IsRegistered && 
		                   event.Status == models.EventStatusPublished &&
		                   event.StartTime.After(time.Now())
	} else {
		event.CanRegister = !event.IsRegistered && 
		                   event.Status == models.EventStatusPublished &&
		                   event.StartTime.After(time.Now())
	}
}

func (s *EventService) incrementViewCount(ctx context.Context, eventID uuid.UUID, userID *uuid.UUID) {
	// Increment view count in Redis
	viewKey := database.EventViewCountKey(eventID.String())
	s.redis.Incr(ctx, viewKey)

	// Record view in database (optional, for analytics)
	if userID != nil {
		query := `
			INSERT INTO event_views (event_id, user_id, viewed_at) 
			VALUES ($1, $2, NOW()) 
			ON CONFLICT (event_id, user_id) DO NOTHING
		`
		s.db.ExecContext(ctx, query, eventID, *userID)
	}
}

func (s *EventService) eventToMap(event *models.Event) map[string]interface{} {
	data, _ := json.Marshal(event)
	var result map[string]interface{}
	json.Unmarshal(data, &result)
	return result
}

func (s *EventService) buildListQuery(filters *models.EventFilters) (string, []interface{}, error) {
	baseQuery := `
		SELECT id, title, description, short_description, category, tags,
		       organizer_id, organizer_name, venue_id, venue_name, venue_address,
		       is_virtual, virtual_url, start_time, end_time, timezone,
		       is_paid, price, currency, max_capacity, current_capacity,
		       registration_fee, images, status, is_published, is_featured,
		       curation_score, created_at, updated_at, published_at
		FROM events WHERE 1=1
	`

	conditions := []string{}
	args := []interface{}{}
	argCount := 1

	// Default filter - only published events
	conditions = append(conditions, "is_published = true")
	conditions = append(conditions, "status = 'published'")

	if filters.Category != nil {
		conditions = append(conditions, fmt.Sprintf("category = $%d", argCount))
		args = append(args, *filters.Category)
		argCount++
	}

	if filters.OrganizerID != nil {
		conditions = append(conditions, fmt.Sprintf("organizer_id = $%d", argCount))
		args = append(args, *filters.OrganizerID)
		argCount++
	}

	if filters.StartDate != nil {
		conditions = append(conditions, fmt.Sprintf("start_time >= $%d", argCount))
		args = append(args, *filters.StartDate)
		argCount++
	}

	if filters.EndDate != nil {
		conditions = append(conditions, fmt.Sprintf("start_time <= $%d", argCount))
		args = append(args, *filters.EndDate)
		argCount++
	}

	if filters.IsVirtual != nil {
		conditions = append(conditions, fmt.Sprintf("is_virtual = $%d", argCount))
		args = append(args, *filters.IsVirtual)
		argCount++
	}

	if filters.IsFree != nil {
		if *filters.IsFree {
			conditions = append(conditions, "is_paid = false")
		} else {
			conditions = append(conditions, "is_paid = true")
		}
	}

	if filters.MinPrice != nil {
		conditions = append(conditions, fmt.Sprintf("(price IS NULL OR price >= $%d)", argCount))
		args = append(args, *filters.MinPrice)
		argCount++
	}

	if filters.MaxPrice != nil {
		conditions = append(conditions, fmt.Sprintf("(price IS NULL OR price <= $%d)", argCount))
		args = append(args, *filters.MaxPrice)
		argCount++
	}

	if filters.HasAvailableSpots != nil && *filters.HasAvailableSpots {
		conditions = append(conditions, "(max_capacity IS NULL OR current_capacity < max_capacity)")
	}

	if filters.Featured != nil {
		conditions = append(conditions, fmt.Sprintf("is_featured = $%d", argCount))
		args = append(args, *filters.Featured)
		argCount++
	}

	// Build WHERE clause
	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " AND " + strings.Join(conditions, " AND ")
	}

	// Add ORDER BY
	orderBy := "ORDER BY start_time ASC"
	if filters.SortBy != "" {
		direction := "ASC"
		if filters.SortOrder == "desc" {
			direction = "DESC"
		}

		switch filters.SortBy {
		case "start_time":
			orderBy = fmt.Sprintf("ORDER BY start_time %s", direction)
		case "created_at":
			orderBy = fmt.Sprintf("ORDER BY created_at %s", direction)
		case "price":
			orderBy = fmt.Sprintf("ORDER BY price %s NULLS LAST", direction)
		case "popularity":
			orderBy = fmt.Sprintf("ORDER BY current_capacity %s", direction)
		case "curation_score":
			orderBy = fmt.Sprintf("ORDER BY curation_score %s NULLS LAST", direction)
		}
	}

	// Add LIMIT and OFFSET
	pageSize := filters.PageSize
	if pageSize <= 0 {
		pageSize = 20
	}

	page := filters.Page
	if page <= 0 {
		page = 1
	}

	offset := (page - 1) * pageSize

	limitOffset := fmt.Sprintf(" LIMIT $%d OFFSET $%d", argCount, argCount+1)
	args = append(args, pageSize, offset)

	query := baseQuery + whereClause + " " + orderBy + limitOffset

	return query, args, nil
}

func (s *EventService) buildCountQuery(filters *models.EventFilters) (string, []interface{}) {
	baseQuery := "SELECT COUNT(*) FROM events WHERE 1=1"

	conditions := []string{}
	args := []interface{}{}
	argCount := 1

	// Apply same filters as list query (without pagination)
	conditions = append(conditions, "is_published = true")
	conditions = append(conditions, "status = 'published'")

	if filters.Category != nil {
		conditions = append(conditions, fmt.Sprintf("category = $%d", argCount))
		args = append(args, *filters.Category)
		argCount++
	}

	// ... (repeat other filters from buildListQuery)

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " AND " + strings.Join(conditions, " AND ")
	}

	return baseQuery + whereClause, args
}

func (s *EventService) generateListCacheKey(filters *models.EventFilters) string {
	// Create a hash of the filters for cache key
	filterStr := fmt.Sprintf("%+v", filters)
	return database.EventListCacheKeyPrefix + filterStr
}

func (s *EventService) cacheEventList(ctx context.Context, cacheKey string, response *models.EventListResponse) {
	data, _ := json.Marshal(response)
	s.redis.Set(ctx, cacheKey, data, 10*time.Minute) // Shorter TTL for list caches
}

func (s *EventService) getEventListFromCache(ctx context.Context, cacheKey string) (*models.EventListResponse, error) {
	data, err := s.redis.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil, err
	}
	
	var response models.EventListResponse
	err = json.Unmarshal([]byte(data), &response)
	return &response, err
}