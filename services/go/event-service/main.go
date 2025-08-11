package main

import (
	"log"

	"events-platform/services/go/event-service/internal/config"
	"events-platform/services/go/event-service/internal/database"
	"events-platform/services/go/event-service/internal/router"
	"events-platform/services/go/event-service/internal/services"

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

	// Initialize NATS
	natsClient, err := database.ConnectNATS(cfg.NATSURLs)
	if err != nil {
		logger.Fatal("Failed to connect to NATS", zap.Error(err))
	}
	defer natsClient.Close()

	// Initialize services
	eventService := services.NewEventService(db, redisClient, natsClient, logger)
	registrationService := services.NewRegistrationService(db, redisClient, natsClient, logger)

	// Setup router
	r := gin.New()
	router.SetupRoutes(r, eventService, registrationService, cfg, logger)

	port := cfg.Port
	if port == "" {
		port = "8082"
	}

	logger.Info("Starting Event Service", zap.String("port", port))
	log.Fatal(r.Run(":" + port))
}