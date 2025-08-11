package main

import (
	"log"

	"events-platform/services/go/websocket-gateway/internal/config"
	"events-platform/services/go/websocket-gateway/internal/database"
	"events-platform/services/go/websocket-gateway/internal/router"
	"events-platform/services/go/websocket-gateway/internal/services"

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
	connectionManager := services.NewConnectionManager(redisClient, logger)
	messageHandler := services.NewMessageHandler(connectionManager, natsClient, logger)
	roomManager := services.NewRoomManager(redisClient, logger)

	// Start message handler
	if err := messageHandler.Start(); err != nil {
		logger.Fatal("Failed to start message handler", zap.Error(err))
	}

	// Setup router
	r := gin.New()
	router.SetupRoutes(r, connectionManager, messageHandler, roomManager, cfg, logger)

	port := cfg.Port
	if port == "" {
		port = "8084"
	}

	logger.Info("Starting WebSocket Gateway", zap.String("port", port))
	log.Fatal(r.Run(":" + port))
}