package router

import (
	"events-platform/services/go/event-service/internal/config"
	"events-platform/services/go/event-service/internal/handlers"
	"events-platform/services/go/event-service/internal/middleware"
	"events-platform/services/go/event-service/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

func SetupRoutes(
	r *gin.Engine,
	eventService *services.EventService,
	registrationService *services.RegistrationService,
	cfg *config.Config,
	logger *zap.Logger,
) {
	// Global middleware
	r.Use(middleware.Logger(logger))
	r.Use(middleware.Recovery(logger))
	// CORS handled by API Gateway
	r.Use(middleware.Metrics())

	// Health check
	r.GET("/health", handlers.HealthCheck)
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Initialize handlers
	eventHandler := handlers.NewEventHandler(eventService, registrationService, logger)

	// API v1 routes
	v1 := r.Group("/api/v1/events")

	// Public routes (no auth required)
	public := v1.Group("")
	public.Use(middleware.AuthOptional(cfg.JWTSecret))
	{
		public.GET("", eventHandler.ListEvents)
		public.GET("/:id", eventHandler.GetEvent)
		public.GET("/trending", eventHandler.ListEvents) // Will filter by trending
		public.GET("/categories", func(c *gin.Context) {
			// TODO: Implement categories endpoint
			c.JSON(200, gin.H{"categories": []string{
				"technology", "business", "arts", "music", "sports", "education",
				"health", "food", "travel", "networking", "entertainment",
			}})
		})
	}

	// Protected routes (auth required)
	protected := v1.Group("")
	protected.Use(middleware.AuthRequired(cfg.JWTSecret))
	{
		// Event management
		protected.POST("", eventHandler.CreateEvent)
		protected.PUT("/:id", eventHandler.UpdateEvent)
		protected.DELETE("/:id", eventHandler.DeleteEvent)
		protected.POST("/:id/publish", eventHandler.PublishEvent)

		// Event registration
		protected.POST("/:id/register", eventHandler.RegisterForEvent)
		protected.DELETE("/:id/register", eventHandler.CancelRegistration)

		// Registration management (for event organizers)
		protected.GET("/:id/registrations", eventHandler.GetEventRegistrations)

		// User's registrations
		protected.GET("/my-registrations", eventHandler.GetMyRegistrations)
	}
}