package handlers

import (
	"net/http"
	"strconv"
	"time"

	"events-platform/services/go/event-service/internal/models"
	"events-platform/services/go/event-service/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type EventHandler struct {
	eventService        *services.EventService
	registrationService *services.RegistrationService
	logger              *zap.Logger
}

func NewEventHandler(eventService *services.EventService, registrationService *services.RegistrationService, logger *zap.Logger) *EventHandler {
	return &EventHandler{
		eventService:        eventService,
		registrationService: registrationService,
		logger:              logger,
	}
}

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "event-service",
		"timestamp": time.Now().Unix(),
	})
}

func (h *EventHandler) CreateEvent(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	userName, exists := c.Get("userName")
	if !exists {
		userName = "Unknown User" // Fallback
	}

	var req models.CreateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	event, err := h.eventService.CreateEvent(c.Request.Context(), &req, userID.(uuid.UUID), userName.(string))
	if err != nil {
		h.logger.Error("Failed to create event",
			zap.String("user_id", userID.(uuid.UUID).String()),
			zap.Error(err))

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event"})
		return
	}

	h.logger.Info("Event created",
		zap.String("event_id", event.ID.String()),
		zap.String("user_id", userID.(uuid.UUID).String()))

	c.JSON(http.StatusCreated, event)
}

func (h *EventHandler) GetEvent(c *gin.Context) {
	eventIDStr := c.Param("id")
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	userID, _ := c.Get("userID")
	var userIDPtr *uuid.UUID
	if userID != nil {
		uid := userID.(uuid.UUID)
		userIDPtr = &uid
	}

	event, err := h.eventService.GetEventByID(c.Request.Context(), eventID, userIDPtr)
	if err != nil {
		h.logger.Error("Failed to get event",
			zap.String("event_id", eventID.String()),
			zap.Error(err))

		switch err {
		case services.ErrEventNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get event"})
		}
		return
	}

	c.JSON(http.StatusOK, event)
}

func (h *EventHandler) UpdateEvent(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	eventIDStr := c.Param("id")
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var req models.UpdateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	event, err := h.eventService.UpdateEvent(c.Request.Context(), eventID, userID.(uuid.UUID), &req)
	if err != nil {
		h.logger.Error("Failed to update event",
			zap.String("event_id", eventID.String()),
			zap.String("user_id", userID.(uuid.UUID).String()),
			zap.Error(err))

		switch err {
		case services.ErrEventNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		case services.ErrUnauthorized:
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to update this event"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event"})
		}
		return
	}

	c.JSON(http.StatusOK, event)
}

func (h *EventHandler) DeleteEvent(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	eventIDStr := c.Param("id")
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	err = h.eventService.DeleteEvent(c.Request.Context(), eventID, userID.(uuid.UUID))
	if err != nil {
		h.logger.Error("Failed to delete event",
			zap.String("event_id", eventID.String()),
			zap.String("user_id", userID.(uuid.UUID).String()),
			zap.Error(err))

		switch err {
		case services.ErrEventNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		case services.ErrUnauthorized:
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to delete this event"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event deleted successfully"})
}

func (h *EventHandler) ListEvents(c *gin.Context) {
	filters := &models.EventFilters{}

	// Parse query parameters
	if category := c.Query("category"); category != "" {
		filters.Category = &category
	}

	if location := c.Query("location"); location != "" {
		filters.Location = &location
	}

	if minPriceStr := c.Query("min_price"); minPriceStr != "" {
		if minPrice, err := strconv.ParseFloat(minPriceStr, 64); err == nil {
			filters.MinPrice = &minPrice
		}
	}

	if maxPriceStr := c.Query("max_price"); maxPriceStr != "" {
		if maxPrice, err := strconv.ParseFloat(maxPriceStr, 64); err == nil {
			filters.MaxPrice = &maxPrice
		}
	}

	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if startDate, err := time.Parse("2006-01-02", startDateStr); err == nil {
			filters.StartDate = &startDate
		}
	}

	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if endDate, err := time.Parse("2006-01-02", endDateStr); err == nil {
			filters.EndDate = &endDate
		}
	}

	if isVirtualStr := c.Query("is_virtual"); isVirtualStr != "" {
		if isVirtual, err := strconv.ParseBool(isVirtualStr); err == nil {
			filters.IsVirtual = &isVirtual
		}
	}

	if isFreeStr := c.Query("is_free"); isFreeStr != "" {
		if isFree, err := strconv.ParseBool(isFreeStr); err == nil {
			filters.IsFree = &isFree
		}
	}

	if featuredStr := c.Query("featured"); featuredStr != "" {
		if featured, err := strconv.ParseBool(featuredStr); err == nil {
			filters.Featured = &featured
		}
	}

	if organizerIDStr := c.Query("organizer_id"); organizerIDStr != "" {
		if organizerID, err := uuid.Parse(organizerIDStr); err == nil {
			filters.OrganizerID = &organizerID
		}
	}

	// Pagination
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			filters.Page = page
		}
	}
	if filters.Page == 0 {
		filters.Page = 1
	}

	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if pageSize, err := strconv.Atoi(pageSizeStr); err == nil && pageSize > 0 && pageSize <= 100 {
			filters.PageSize = pageSize
		}
	}
	if filters.PageSize == 0 {
		filters.PageSize = 20
	}

	// Sorting
	if sortBy := c.Query("sort_by"); sortBy != "" {
		filters.SortBy = sortBy
	}

	if sortOrder := c.Query("sort_order"); sortOrder != "" {
		filters.SortOrder = sortOrder
	}

	userID, _ := c.Get("userID")
	var userIDPtr *uuid.UUID
	if userID != nil {
		uid := userID.(uuid.UUID)
		userIDPtr = &uid
	}

	response, err := h.eventService.ListEvents(c.Request.Context(), filters, userIDPtr)
	if err != nil {
		h.logger.Error("Failed to list events", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list events"})
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *EventHandler) PublishEvent(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	eventIDStr := c.Param("id")
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	err = h.eventService.PublishEvent(c.Request.Context(), eventID, userID.(uuid.UUID))
	if err != nil {
		h.logger.Error("Failed to publish event",
			zap.String("event_id", eventID.String()),
			zap.String("user_id", userID.(uuid.UUID).String()),
			zap.Error(err))

		switch err {
		case services.ErrEventNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		case services.ErrUnauthorized:
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to publish this event"})
		case services.ErrInvalidEventStatus:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Event must be in draft status to publish"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to publish event"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event published successfully"})
}

func (h *EventHandler) RegisterForEvent(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	userName, _ := c.Get("userName")
	userEmail, _ := c.Get("userEmail")

	eventIDStr := c.Param("id")
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	req := &models.RegisterEventRequest{
		EventID: eventID,
	}

	// Parse any additional metadata from request body
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err == nil {
		if metadata, ok := body["metadata"].(map[string]interface{}); ok {
			req.Metadata = metadata
		}
	}

	registration, err := h.registrationService.RegisterForEvent(
		c.Request.Context(), 
		req, 
		userID.(uuid.UUID), 
		userName.(string), 
		userEmail.(string),
	)
	if err != nil {
		h.logger.Error("Failed to register for event",
			zap.String("event_id", eventID.String()),
			zap.String("user_id", userID.(uuid.UUID).String()),
			zap.Error(err))

		switch err {
		case services.ErrEventNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		case services.ErrEventNotPublished:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Event is not available for registration"})
		case services.ErrEventInPast:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Event has already passed"})
		case services.ErrAlreadyRegistered:
			c.JSON(http.StatusConflict, gin.H{"error": "Already registered for this event"})
		case services.ErrEventCapacityFull:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Event is at capacity"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register for event"})
		}
		return
	}

	c.JSON(http.StatusCreated, registration)
}

func (h *EventHandler) CancelRegistration(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	eventIDStr := c.Param("id")
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	err = h.registrationService.CancelRegistration(c.Request.Context(), eventID, userID.(uuid.UUID))
	if err != nil {
		h.logger.Error("Failed to cancel registration",
			zap.String("event_id", eventID.String()),
			zap.String("user_id", userID.(uuid.UUID).String()),
			zap.Error(err))

		switch err {
		case services.ErrNotRegistered:
			c.JSON(http.StatusNotFound, gin.H{"error": "Not registered for this event"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel registration"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Registration cancelled successfully"})
}

func (h *EventHandler) GetMyRegistrations(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	var status *models.RegistrationStatus
	if statusStr := c.Query("status"); statusStr != "" {
		s := models.RegistrationStatus(statusStr)
		status = &s
	}

	registrations, err := h.registrationService.GetUserRegistrations(c.Request.Context(), userID.(uuid.UUID), status)
	if err != nil {
		h.logger.Error("Failed to get user registrations",
			zap.String("user_id", userID.(uuid.UUID).String()),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get registrations"})
		return
	}

	c.JSON(http.StatusOK, registrations)
}

func (h *EventHandler) GetEventRegistrations(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	eventIDStr := c.Param("id")
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	registrations, err := h.registrationService.GetEventRegistrations(c.Request.Context(), eventID, userID.(uuid.UUID))
	if err != nil {
		h.logger.Error("Failed to get event registrations",
			zap.String("event_id", eventID.String()),
			zap.String("user_id", userID.(uuid.UUID).String()),
			zap.Error(err))

		switch err {
		case services.ErrEventNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		case services.ErrUnauthorized:
			c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to view registrations for this event"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get registrations"})
		}
		return
	}

	c.JSON(http.StatusOK, registrations)
}