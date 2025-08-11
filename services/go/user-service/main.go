package main

import (
	"log"

	"events-platform/services/go/user-service/internal/config"
	"events-platform/services/go/user-service/internal/database"
	"events-platform/services/go/user-service/internal/router"
	"events-platform/services/go/user-service/internal/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func main() {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	cfg := config.Load()
	
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	// Initialize Redis
	redisClient, err := database.ConnectRedis(cfg.RedisURL)
	if err != nil {
		logger.Fatal("Failed to connect to Redis", zap.Error(err))
	}
	defer redisClient.Close()

	// Initialize services
	userService := services.NewUserService(db, redisClient, logger)
	authService := services.NewAuthService(db, redisClient, cfg.JWTSecret, logger)

	// Setup router
	r := gin.New()
	router.SetupRoutes(r, userService, authService, cfg, logger)

	port := cfg.Port
	if port == "" {
		port = "8081"
	}

	logger.Info("Starting User Service", zap.String("port", port))
	log.Fatal(r.Run(":" + port))
}