package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Environment    string
	Port          string
	RedisURL      string
	JWTSecret     string
	
	// Service URLs
	UserServiceURL   string
	EventServiceURL  string
	SearchServiceURL string
	PaymentServiceURL string
	WebSocketURL     string
	
	// Rate limiting
	RateLimitRPS int
	RateLimitBurst int
	
	// Timeouts
	RequestTimeout time.Duration
}

func Load() *Config {
	return &Config{
		Environment:      getEnv("ENVIRONMENT", "development"),
		Port:            getEnv("PORT", "8080"),
		RedisURL:        getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:       getEnv("JWT_SECRET", "your-secret-key"),
		
		UserServiceURL:   getEnv("USER_SERVICE_URL", "http://localhost:8081"),
		EventServiceURL:  getEnv("EVENT_SERVICE_URL", "http://localhost:8082"),
		SearchServiceURL: getEnv("SEARCH_SERVICE_URL", "http://localhost:8083"),
		PaymentServiceURL: getEnv("PAYMENT_SERVICE_URL", "http://localhost:8084"),
		WebSocketURL:     getEnv("WEBSOCKET_URL", "http://localhost:8084"),
		
		RateLimitRPS:     getEnvInt("RATE_LIMIT_RPS", 100),
		RateLimitBurst:   getEnvInt("RATE_LIMIT_BURST", 200),
		
		RequestTimeout:   time.Duration(getEnvInt("REQUEST_TIMEOUT_SECONDS", 30)) * time.Second,
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