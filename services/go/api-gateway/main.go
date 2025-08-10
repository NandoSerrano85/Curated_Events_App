package main

import (
	"log"
	"os"

	"events-platform/services/go/api-gateway/internal/config"
	"events-platform/services/go/api-gateway/internal/router"
	"events-platform/services/go/api-gateway/internal/middleware"

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

	r := gin.New()
	
	// Global middleware
	r.Use(middleware.Logger(logger))
	r.Use(middleware.Recovery(logger))
	r.Use(middleware.CORS())
	r.Use(middleware.RateLimit())
	r.Use(middleware.Metrics())

	// Setup routes
	router.SetupRoutes(r, cfg, logger)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	logger.Info("Starting API Gateway", zap.String("port", port))
	log.Fatal(r.Run(":" + port))
}