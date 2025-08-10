package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Environment   string
	Port         string
	DatabaseURL  string
	RedisURL     string
	NATSURLs     []string
	
	// Cache settings
	CacheTTL        time.Duration
	EventCacheSize  int
	
	// Rate limiting
	CreateEventRateLimit int
	CreateEventWindow    time.Duration
	
	// File upload
	MaxFileSize      int64
	AllowedFileTypes []string
	ImageStorageURL  string
	
	// External services
	PaymentServiceURL      string
	NotificationServiceURL string
	CurationServiceURL     string
}

func Load() *Config {
	return &Config{
		Environment: getEnv("ENVIRONMENT", "development"),
		Port:       getEnv("PORT", "8082"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://user:password@localhost/events_db?sslmode=disable"),
		RedisURL:   getEnv("REDIS_URL", "redis://localhost:6379"),
		NATSURLs:   strings.Split(getEnv("NATS_URLS", "nats://localhost:4222"), ","),
		
		CacheTTL:       time.Duration(getEnvInt("CACHE_TTL_MINUTES", 30)) * time.Minute,
		EventCacheSize: getEnvInt("EVENT_CACHE_SIZE", 1000),
		
		CreateEventRateLimit: getEnvInt("CREATE_EVENT_RATE_LIMIT", 10),
		CreateEventWindow:    time.Duration(getEnvInt("CREATE_EVENT_WINDOW_HOURS", 1)) * time.Hour,
		
		MaxFileSize: int64(getEnvInt("MAX_FILE_SIZE_MB", 10)) * 1024 * 1024,
		AllowedFileTypes: strings.Split(getEnv("ALLOWED_FILE_TYPES", "jpg,jpeg,png,webp"), ","),
		ImageStorageURL:  getEnv("IMAGE_STORAGE_URL", "http://media-processing:8095"),
		
		PaymentServiceURL:      getEnv("PAYMENT_SERVICE_URL", "http://payment-service:8084"),
		NotificationServiceURL: getEnv("NOTIFICATION_SERVICE_URL", "http://notification-service:8090"),
		CurationServiceURL:     getEnv("CURATION_SERVICE_URL", "http://curation-service:8091"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}