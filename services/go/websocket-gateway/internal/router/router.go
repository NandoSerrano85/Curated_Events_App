package router

import (
	"net/http"

	"events-platform/services/go/websocket-gateway/internal/config"
	"events-platform/services/go/websocket-gateway/internal/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// SetupRoutes configures all routes for the websocket gateway
func SetupRoutes(r *gin.Engine, connectionManager *services.ConnectionManager, messageHandler *services.MessageHandler, roomManager *services.RoomManager, cfg *config.Config, logger *zap.Logger) {
	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "websocket-gateway",
		})
	})

	// Metrics endpoint
	r.GET("/metrics", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"service": "websocket-gateway",
			"status":  "healthy",
		})
	})

	// WebSocket endpoints
	r.GET("/ws", handleWebSocketConnection(connectionManager, logger))
	r.GET("/ws/connect", handleWebSocketConnection(connectionManager, logger))
	
	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Room management
		rooms := v1.Group("/rooms")
		{
			rooms.POST("/:room_id/join", handleJoinRoom(roomManager, logger))
			rooms.POST("/:room_id/leave", handleLeaveRoom(roomManager, logger))
			rooms.GET("/:room_id/members", handleGetRoomMembers(roomManager, logger))
			rooms.POST("/:room_id/message", handleSendMessage(messageHandler, logger))
		}

		// Connection management
		connections := v1.Group("/connections")
		{
			connections.GET("/status", handleConnectionStatus(connectionManager, logger))
			connections.POST("/broadcast", handleBroadcast(messageHandler, logger))
		}
	}
}

func handleWebSocketConnection(connectionManager *services.ConnectionManager, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "WebSocket connection endpoint - implementation pending",
			"upgrade": "websocket upgrade will be implemented here",
		})
	}
}

func handleJoinRoom(roomManager *services.RoomManager, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		roomID := c.Param("room_id")
		c.JSON(http.StatusOK, gin.H{
			"message": "Join room endpoint - implementation pending",
			"room_id": roomID,
		})
	}
}

func handleLeaveRoom(roomManager *services.RoomManager, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		roomID := c.Param("room_id")
		c.JSON(http.StatusOK, gin.H{
			"message": "Leave room endpoint - implementation pending",
			"room_id": roomID,
		})
	}
}

func handleGetRoomMembers(roomManager *services.RoomManager, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		roomID := c.Param("room_id")
		c.JSON(http.StatusOK, gin.H{
			"message": "Get room members endpoint - implementation pending",
			"room_id": roomID,
		})
	}
}

func handleSendMessage(messageHandler *services.MessageHandler, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		roomID := c.Param("room_id")
		c.JSON(http.StatusOK, gin.H{
			"message": "Send message endpoint - implementation pending",
			"room_id": roomID,
		})
	}
}

func handleConnectionStatus(connectionManager *services.ConnectionManager, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Connection status endpoint - implementation pending",
		})
	}
}

func handleBroadcast(messageHandler *services.MessageHandler, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Broadcast endpoint - implementation pending",
		})
	}
}