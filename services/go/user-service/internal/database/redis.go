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

const (
	LoginAttemptsKeyPrefix = "login_attempts:"
	RefreshTokenKeyPrefix  = "refresh_token:"
	UserSessionKeyPrefix   = "user_session:"
)

func LoginAttemptsKey(email string) string {
	return LoginAttemptsKeyPrefix + email
}

func RefreshTokenKey(tokenHash string) string {
	return RefreshTokenKeyPrefix + tokenHash
}

func UserSessionKey(userID string) string {
	return UserSessionKeyPrefix + userID
}