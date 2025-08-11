package router

import (
	"net/http"

	"events-platform/services/go/search-service/internal/config"
	"events-platform/services/go/search-service/internal/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// SetupRoutes configures all routes for the search service
func SetupRoutes(r *gin.Engine, searchService *services.SearchService, indexService *services.IndexService, cfg *config.Config, logger *zap.Logger) {
	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "search-service",
		})
	})

	// Metrics endpoint
	r.GET("/metrics", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"service": "search-service",
			"status":  "healthy",
		})
	})

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Search endpoints
		v1.POST("/search", handleSearch(searchService, logger))
		v1.POST("/search/advanced", handleAdvancedSearch(searchService, logger))
		v1.GET("/search/suggestions", handleSearchSuggestions(searchService, logger))
		
		// Index management (admin endpoints)
		admin := v1.Group("/admin")
		{
			admin.POST("/index/rebuild", handleRebuildIndex(indexService, logger))
			admin.POST("/index/events/:id", handleIndexEvent(indexService, logger))
			admin.DELETE("/index/events/:id", handleDeleteFromIndex(indexService, logger))
		}
	}
}

func handleSearch(searchService *services.SearchService, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Search endpoint - implementation pending",
			"query":   c.Query("q"),
		})
	}
}

func handleAdvancedSearch(searchService *services.SearchService, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Advanced search endpoint - implementation pending",
		})
	}
}

func handleSearchSuggestions(searchService *services.SearchService, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Search suggestions endpoint - implementation pending",
			"query":   c.Query("q"),
		})
	}
}

func handleRebuildIndex(indexService *services.IndexService, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Rebuild index endpoint - implementation pending",
		})
	}
}

func handleIndexEvent(indexService *services.IndexService, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		eventID := c.Param("id")
		c.JSON(http.StatusOK, gin.H{
			"message":  "Index event endpoint - implementation pending",
			"event_id": eventID,
		})
	}
}

func handleDeleteFromIndex(indexService *services.IndexService, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		eventID := c.Param("id")
		c.JSON(http.StatusOK, gin.H{
			"message":  "Delete from index endpoint - implementation pending",
			"event_id": eventID,
		})
	}
}