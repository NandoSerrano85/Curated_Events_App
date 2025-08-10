package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"events-platform/services/go/websocket-gateway/internal/database"
	"events-platform/services/go/websocket-gateway/internal/models"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type RoomManager struct {
	redis  *redis.Client
	logger *zap.Logger
}

func NewRoomManager(redis *redis.Client, logger *zap.Logger) *RoomManager {
	return &RoomManager{
		redis:  redis,
		logger: logger,
	}
}

func (rm *RoomManager) CreateRoom(room *models.Room) error {
	ctx := context.Background()

	// Set default values
	room.CreatedAt = time.Now()
	room.UpdatedAt = time.Now()
	room.ConnectionCount = 0
	room.LastActivity = time.Now()

	if room.MaxSize <= 0 {
		room.MaxSize = 1000 // Default max size
	}

	// Store room data in Redis
	roomData, err := json.Marshal(room)
	if err != nil {
		return err
	}

	key := database.WSRoomDataKey(room.ID)
	err = rm.redis.Set(ctx, key, roomData, 0).Err() // No expiration
	if err != nil {
		return err
	}

	rm.logger.Info("Room created",
		zap.String("room_id", room.ID),
		zap.String("type", string(room.Type)),
		zap.String("created_by", room.CreatedBy.String()))

	return nil
}

func (rm *RoomManager) GetRoom(roomID string) (*models.Room, error) {
	ctx := context.Background()
	key := database.WSRoomDataKey(roomID)

	data, err := rm.redis.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, fmt.Errorf("room not found")
		}
		return nil, err
	}

	var room models.Room
	err = json.Unmarshal([]byte(data), &room)
	if err != nil {
		return nil, err
	}

	// Update connection count from Redis
	connKey := database.WSRoomConnectionsKey(roomID)
	count, _ := rm.redis.SCard(ctx, connKey).Result()
	room.ConnectionCount = int(count)

	return &room, nil
}

func (rm *RoomManager) UpdateRoom(roomID string, updates map[string]interface{}) error {
	ctx := context.Background()

	// Get current room data
	room, err := rm.GetRoom(roomID)
	if err != nil {
		return err
	}

	// Apply updates
	if name, ok := updates["name"].(string); ok {
		room.Name = name
	}
	if description, ok := updates["description"].(string); ok {
		room.Description = description
	}
	if maxSize, ok := updates["max_size"].(int); ok {
		room.MaxSize = maxSize
	}
	if isPrivate, ok := updates["is_private"].(bool); ok {
		room.IsPrivate = isPrivate
	}
	if settings, ok := updates["settings"].(models.RoomSettings); ok {
		room.Settings = settings
	}

	room.UpdatedAt = time.Now()

	// Save updated room
	roomData, err := json.Marshal(room)
	if err != nil {
		return err
	}

	key := database.WSRoomDataKey(roomID)
	return rm.redis.Set(ctx, key, roomData, 0).Err()
}

func (rm *RoomManager) DeleteRoom(roomID string) error {
	ctx := context.Background()

	// Delete room data
	dataKey := database.WSRoomDataKey(roomID)
	rm.redis.Del(ctx, dataKey)

	// Delete connections list
	connKey := database.WSRoomConnectionsKey(roomID)
	rm.redis.Del(ctx, connKey)

	// Delete stats
	statsKey := database.WSRoomStatsKey(roomID)
	rm.redis.Del(ctx, statsKey)

	rm.logger.Info("Room deleted", zap.String("room_id", roomID))
	return nil
}

func (rm *RoomManager) ListRooms(roomType *models.RoomType, limit int) ([]*models.Room, error) {
	ctx := context.Background()

	// Get all room keys
	pattern := database.WSRoomDataPrefix + "*"
	keys, err := rm.redis.Keys(ctx, pattern).Result()
	if err != nil {
		return nil, err
	}

	rooms := make([]*models.Room, 0)
	
	for _, key := range keys {
		if limit > 0 && len(rooms) >= limit {
			break
		}

		data, err := rm.redis.Get(ctx, key).Result()
		if err != nil {
			continue
		}

		var room models.Room
		if err := json.Unmarshal([]byte(data), &room); err != nil {
			continue
		}

		// Filter by type if specified
		if roomType != nil && room.Type != *roomType {
			continue
		}

		// Skip private rooms in public listings
		if room.IsPrivate {
			continue
		}

		// Update connection count
		connKey := database.WSRoomConnectionsKey(room.ID)
		count, _ := rm.redis.SCard(ctx, connKey).Result()
		room.ConnectionCount = int(count)

		rooms = append(rooms, &room)
	}

	return rooms, nil
}

func (rm *RoomManager) GetRoomConnections(roomID string) ([]string, error) {
	ctx := context.Background()
	key := database.WSRoomConnectionsKey(roomID)

	connections, err := rm.redis.SMembers(ctx, key).Result()
	if err != nil {
		return nil, err
	}

	return connections, nil
}

func (rm *RoomManager) GetRoomStats(roomID string) (*models.RoomStats, error) {
	ctx := context.Background()
	
	room, err := rm.GetRoom(roomID)
	if err != nil {
		return nil, err
	}

	statsKey := database.WSRoomStatsKey(roomID)
	
	// Get or create stats
	var stats models.RoomStats
	data, err := rm.redis.Get(ctx, statsKey).Result()
	if err == nil {
		json.Unmarshal([]byte(data), &stats)
	} else {
		// Initialize new stats
		stats = models.RoomStats{
			RoomID:          roomID,
			ConnectionCount: room.ConnectionCount,
			MessageCount:    0,
			CreatedAt:       room.CreatedAt,
			LastActivity:    room.LastActivity,
			AverageStayTime: 0,
		}
	}

	// Update current connection count
	connKey := database.WSRoomConnectionsKey(roomID)
	count, _ := rm.redis.SCard(ctx, connKey).Result()
	stats.ConnectionCount = int(count)

	return &stats, nil
}

func (rm *RoomManager) UpdateRoomActivity(roomID string) error {
	ctx := context.Background()
	
	// Update last activity in room data
	room, err := rm.GetRoom(roomID)
	if err != nil {
		return err
	}

	room.LastActivity = time.Now()
	room.UpdatedAt = time.Now()

	roomData, err := json.Marshal(room)
	if err != nil {
		return err
	}

	key := database.WSRoomDataKey(roomID)
	return rm.redis.Set(ctx, key, roomData, 0).Err()
}

func (rm *RoomManager) IncrementMessageCount(roomID string) error {
	ctx := context.Background()
	
	statsKey := database.WSRoomStatsKey(roomID)
	
	// Get current stats
	stats, err := rm.GetRoomStats(roomID)
	if err != nil {
		return err
	}

	stats.MessageCount++
	stats.LastActivity = time.Now()

	// Save updated stats
	data, err := json.Marshal(stats)
	if err != nil {
		return err
	}

	return rm.redis.Set(ctx, statsKey, data, 24*time.Hour).Err()
}

func (rm *RoomManager) CreateEventRoom(eventID uuid.UUID, eventTitle string, organizerID uuid.UUID) (*models.Room, error) {
	room := &models.Room{
		ID:          "event:" + eventID.String(),
		Type:        models.RoomTypeEvent,
		Name:        eventTitle + " - Discussion",
		Description: "Discussion room for event: " + eventTitle,
		EventID:     &eventID,
		CreatedBy:   organizerID,
		MaxSize:     1000,
		IsPrivate:   false,
		Settings: models.RoomSettings{
			AllowChat:         true,
			AllowAnonymous:    false,
			RequireApproval:   false,
			ModerationEnabled: true,
			RateLimitMessages: 10,
		},
	}

	err := rm.CreateRoom(room)
	if err != nil {
		return nil, err
	}

	return room, nil
}

func (rm *RoomManager) CreateEventLiveRoom(eventID uuid.UUID, eventTitle string, organizerID uuid.UUID) (*models.Room, error) {
	room := &models.Room{
		ID:          "event_live:" + eventID.String(),
		Type:        models.RoomTypeEventLive,
		Name:        eventTitle + " - Live",
		Description: "Live features for event: " + eventTitle,
		EventID:     &eventID,
		CreatedBy:   organizerID,
		MaxSize:     5000,
		IsPrivate:   false,
		Settings: models.RoomSettings{
			AllowChat:         true,
			AllowAnonymous:    false,
			RequireApproval:   false,
			ModerationEnabled: true,
			RateLimitMessages: 5,
		},
	}

	err := rm.CreateRoom(room)
	if err != nil {
		return nil, err
	}

	return room, nil
}

func (rm *RoomManager) CreatePrivateChatRoom(userID1, userID2 uuid.UUID) (*models.Room, error) {
	// Create deterministic room ID for private chat between two users
	var roomID string
	if userID1.String() < userID2.String() {
		roomID = "private:" + userID1.String() + ":" + userID2.String()
	} else {
		roomID = "private:" + userID2.String() + ":" + userID1.String()
	}

	// Check if room already exists
	if existingRoom, err := rm.GetRoom(roomID); err == nil {
		return existingRoom, nil
	}

	room := &models.Room{
		ID:          roomID,
		Type:        models.RoomTypePrivateChat,
		Name:        "Private Chat",
		Description: "Private chat between two users",
		CreatedBy:   userID1,
		MaxSize:     2,
		IsPrivate:   true,
		Settings: models.RoomSettings{
			AllowChat:         true,
			AllowAnonymous:    false,
			RequireApproval:   false,
			ModerationEnabled: false,
			RateLimitMessages: 30,
		},
	}

	err := rm.CreateRoom(room)
	if err != nil {
		return nil, err
	}

	return room, nil
}

func (rm *RoomManager) CleanupIdleRooms(idleTimeout time.Duration) error {
	ctx := context.Background()
	
	// Get all room keys
	pattern := database.WSRoomDataPrefix + "*"
	keys, err := rm.redis.Keys(ctx, pattern).Result()
	if err != nil {
		return err
	}

	cleanupCount := 0
	cutoff := time.Now().Add(-idleTimeout)

	for _, key := range keys {
		data, err := rm.redis.Get(ctx, key).Result()
		if err != nil {
			continue
		}

		var room models.Room
		if err := json.Unmarshal([]byte(data), &room); err != nil {
			continue
		}

		// Check if room has been idle
		if room.LastActivity.Before(cutoff) && room.ConnectionCount == 0 {
			// Don't cleanup permanent rooms (general, event rooms that are still active)
			if room.Type == models.RoomTypeGeneral {
				continue
			}

			// For event rooms, check if the event is still upcoming/active
			if room.Type == models.RoomTypeEvent || room.Type == models.RoomTypeEventLive {
				// In a real implementation, you'd check the event status here
				continue
			}

			// Cleanup idle room
			rm.DeleteRoom(room.ID)
			cleanupCount++
		}
	}

	if cleanupCount > 0 {
		rm.logger.Info("Cleaned up idle rooms", zap.Int("count", cleanupCount))
	}

	return nil
}

func (rm *RoomManager) StartCleanupWorker(idleTimeout time.Duration) {
	ticker := time.NewTicker(30 * time.Minute) // Run cleanup every 30 minutes
	defer ticker.Stop()

	for range ticker.C {
		if err := rm.CleanupIdleRooms(idleTimeout); err != nil {
			rm.logger.Error("Failed to cleanup idle rooms", zap.Error(err))
		}
	}
}