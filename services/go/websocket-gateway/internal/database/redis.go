package database

import (
	"context"
	"time"

	"github.com/go-redis/redis/v8"
)

func ConnectRedis(redisURL string) (*redis.Client, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}

	client := redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return client, nil
}

// Redis key prefixes for WebSocket data
const (
	WSConnectionKeyPrefix    = "ws:connection:"
	WSUserConnectionsPrefix  = "ws:user:connections:"
	WSRoomConnectionsPrefix  = "ws:room:connections:"
	WSRoomDataPrefix         = "ws:room:data:"
	WSRoomStatsPrefix        = "ws:room:stats:"
	WSConnectionStatsKey     = "ws:stats:connections"
	WSMessageStatsKey        = "ws:stats:messages"
	WSRateLimitPrefix        = "ws:rate_limit:"
	WSTypingPrefix           = "ws:typing:"
	WSPresencePrefix         = "ws:presence:"
)

// Key generators
func WSConnectionKey(connectionID string) string {
	return WSConnectionKeyPrefix + connectionID
}

func WSUserConnectionsKey(userID string) string {
	return WSUserConnectionsPrefix + userID
}

func WSRoomConnectionsKey(roomID string) string {
	return WSRoomConnectionsPrefix + roomID
}

func WSRoomDataKey(roomID string) string {
	return WSRoomDataPrefix + roomID
}

func WSRoomStatsKey(roomID string) string {
	return WSRoomStatsPrefix + roomID
}

func WSRateLimitKey(userID string) string {
	return WSRateLimitPrefix + userID
}

func WSTypingKey(roomID string) string {
	return WSTypingPrefix + roomID
}

func WSPresenceKey(userID string) string {
	return WSPresencePrefix + userID
}