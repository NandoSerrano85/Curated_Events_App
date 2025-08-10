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

// Redis key prefixes
const (
	EventCacheKeyPrefix         = "event:"
	EventListCacheKeyPrefix     = "events:list:"
	EventStatsKeyPrefix         = "event:stats:"
	EventViewCountKeyPrefix     = "event:views:"
	EventRegistrationKeyPrefix  = "event:registration:"
	TrendingEventsKey           = "events:trending"
	FeaturedEventsKey           = "events:featured"
	CategoryEventsKeyPrefix     = "events:category:"
	OrganizerEventsKeyPrefix    = "events:organizer:"
	UserRegistrationsKeyPrefix  = "user:registrations:"
)

// Cache key generators
func EventCacheKey(eventID string) string {
	return EventCacheKeyPrefix + eventID
}

func EventListCacheKey(filters string) string {
	return EventListCacheKeyPrefix + filters
}

func EventStatsKey(eventID string) string {
	return EventStatsKeyPrefix + eventID
}

func EventViewCountKey(eventID string) string {
	return EventViewCountKeyPrefix + eventID
}

func EventRegistrationKey(eventID, userID string) string {
	return EventRegistrationKeyPrefix + eventID + ":" + userID
}

func CategoryEventsKey(category string) string {
	return CategoryEventsKeyPrefix + category
}

func OrganizerEventsKey(organizerID string) string {
	return OrganizerEventsKeyPrefix + organizerID
}

func UserRegistrationsKey(userID string) string {
	return UserRegistrationsKeyPrefix + userID
}