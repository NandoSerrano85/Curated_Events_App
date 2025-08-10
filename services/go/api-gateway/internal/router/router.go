package router

import (
	"events-platform/services/go/api-gateway/internal/config"
	"events-platform/services/go/api-gateway/internal/handlers"
	"events-platform/services/go/api-gateway/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

func SetupRoutes(r *gin.Engine, cfg *config.Config, logger *zap.Logger) {
	// Health check
	r.GET("/health", handlers.HealthCheck)
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API v1 routes
	v1 := r.Group("/api/v1")
	
	// Public routes
	auth := v1.Group("/auth")
	{
		auth.POST("/register", handlers.ProxyToUserService(cfg.UserServiceURL))
		auth.POST("/login", handlers.ProxyToUserService(cfg.UserServiceURL))
		auth.POST("/refresh", handlers.ProxyToUserService(cfg.UserServiceURL))
	}

	// Public events (search, browse)
	events := v1.Group("/events")
	{
		events.GET("", handlers.ProxyToEventService(cfg.EventServiceURL))
		events.GET("/:id", handlers.ProxyToEventService(cfg.EventServiceURL))
		events.GET("/search", handlers.ProxyToSearchService(cfg.SearchServiceURL))
		events.GET("/trending", handlers.ProxyToEventService(cfg.EventServiceURL))
		events.GET("/categories", handlers.ProxyToEventService(cfg.EventServiceURL))
	}

	// Protected routes
	protected := v1.Group("")
	protected.Use(middleware.AuthRequired(cfg.JWTSecret))
	{
		// User profile
		users := protected.Group("/users")
		{
			users.GET("/profile", handlers.ProxyToUserService(cfg.UserServiceURL))
			users.PUT("/profile", handlers.ProxyToUserService(cfg.UserServiceURL))
			users.DELETE("/profile", handlers.ProxyToUserService(cfg.UserServiceURL))
			users.GET("/preferences", handlers.ProxyToUserService(cfg.UserServiceURL))
			users.PUT("/preferences", handlers.ProxyToUserService(cfg.UserServiceURL))
		}

		// Event management (for organizers)
		eventManagement := protected.Group("/events")
		{
			eventManagement.POST("", handlers.ProxyToEventService(cfg.EventServiceURL))
			eventManagement.PUT("/:id", handlers.ProxyToEventService(cfg.EventServiceURL))
			eventManagement.DELETE("/:id", handlers.ProxyToEventService(cfg.EventServiceURL))
			eventManagement.POST("/:id/register", handlers.ProxyToEventService(cfg.EventServiceURL))
			eventManagement.DELETE("/:id/register", handlers.ProxyToEventService(cfg.EventServiceURL))
		}

		// Payment routes
		payments := protected.Group("/payments")
		{
			payments.POST("/intent", handlers.ProxyToPaymentService(cfg.PaymentServiceURL))
			payments.POST("/confirm", handlers.ProxyToPaymentService(cfg.PaymentServiceURL))
			payments.GET("/history", handlers.ProxyToPaymentService(cfg.PaymentServiceURL))
		}

		// Advanced search
		search := protected.Group("/search")
		{
			search.POST("/advanced", handlers.ProxyToSearchService(cfg.SearchServiceURL))
			search.GET("/suggestions", handlers.ProxyToSearchService(cfg.SearchServiceURL))
		}

		// Real-time features (WebSocket upgrade handled by websocket service)
		ws := protected.Group("/ws")
		{
			ws.GET("/connect", handlers.ProxyToWebSocketService(cfg.WebSocketURL))
		}
	}
}