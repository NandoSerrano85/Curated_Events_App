package main

import (
	"log"

	"events-platform/services/go/search-service/internal/config"
	"events-platform/services/go/search-service/internal/elasticsearch"
	"events-platform/services/go/search-service/internal/router"
	"events-platform/services/go/search-service/internal/services"

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

	// Initialize Elasticsearch
	esClient, err := elasticsearch.NewClient(cfg.ElasticsearchURL, logger)
	if err != nil {
		logger.Fatal("Failed to connect to Elasticsearch", zap.Error(err))
	}

	// Initialize services
	searchService := services.NewSearchService(esClient, logger)
	indexService := services.NewIndexService(esClient, logger)

	// Setup indices
	if err := indexService.SetupIndices(); err != nil {
		logger.Fatal("Failed to setup Elasticsearch indices", zap.Error(err))
	}

	// Setup router
	r := gin.New()
	router.SetupRoutes(r, searchService, indexService, cfg, logger)

	port := cfg.Port
	if port == "" {
		port = "8083"
	}

	logger.Info("Starting Search Service", zap.String("port", port))
	log.Fatal(r.Run(":" + port))
}