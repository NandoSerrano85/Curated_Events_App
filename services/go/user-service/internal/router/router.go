package router

import (
	"events-platform/services/go/user-service/internal/config"
	"events-platform/services/go/user-service/internal/handlers"
	"events-platform/services/go/user-service/internal/middleware"
	"events-platform/services/go/user-service/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

func SetupRoutes(
	r *gin.Engine, 
	userService *services.UserService, 
	authService *services.AuthService, 
	cfg *config.Config, 
	logger *zap.Logger,
) {
	// Global middleware
	r.Use(middleware.Logger(logger))
	r.Use(middleware.Recovery(logger))
	r.Use(middleware.CORS())
	r.Use(middleware.Metrics())

	// Health check
	r.GET("/health", handlers.HealthCheck)
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Initialize handlers
	userHandler := handlers.NewUserHandler(userService, logger)
	authHandler := handlers.NewAuthHandler(authService, logger)

	// API v1 routes
	v1 := r.Group("/api/v1")

	// Authentication routes (public)
	auth := v1.Group("/auth")
	{
		auth.POST("/register", userHandler.CreateUser)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/logout", authHandler.Logout)
	}

	// User routes (protected)
	users := v1.Group("/users")
	users.Use(middleware.AuthRequired(cfg.JWTSecret))
	{
		users.GET("/profile", userHandler.GetProfile)
		users.PUT("/profile", userHandler.UpdateProfile)
		users.DELETE("/profile", userHandler.DeleteProfile)
		users.POST("/change-password", userHandler.ChangePassword)
		
		// Preferences
		users.GET("/preferences", userHandler.GetPreferences)
		users.PUT("/preferences", userHandler.UpdatePreferences)
	}
}