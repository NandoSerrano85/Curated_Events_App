package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Environment   string
	Port         string
	DatabaseURL  string
	RedisURL     string
	JWTSecret    string
	JWTExpiry    time.Duration
	RefreshExpiry time.Duration
	
	// Password policy
	MinPasswordLength int
	
	// Email verification
	EmailVerificationEnabled bool
	EmailServiceURL         string
	
	// Rate limiting
	LoginAttempts    int
	LoginWindow      time.Duration
	LoginBlockTime   time.Duration
}

func Load() *Config {
	return &Config{
		Environment:  getEnv("ENVIRONMENT", "development"),
		Port:        getEnv("PORT", "8081"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://events_user:events_password@localhost/events_platform?sslmode=disable"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:   getEnv("JWT_SECRET", "your-secret-key"),
		
		JWTExpiry:     time.Duration(getEnvInt("JWT_EXPIRY_HOURS", 24)) * time.Hour,
		RefreshExpiry: time.Duration(getEnvInt("REFRESH_EXPIRY_DAYS", 30)) * 24 * time.Hour,
		
		MinPasswordLength: getEnvInt("MIN_PASSWORD_LENGTH", 8),
		
		EmailVerificationEnabled: getEnvBool("EMAIL_VERIFICATION_ENABLED", false),
		EmailServiceURL:         getEnv("EMAIL_SERVICE_URL", "http://notification-service:8090"),
		
		LoginAttempts:   getEnvInt("LOGIN_ATTEMPTS", 5),
		LoginWindow:     time.Duration(getEnvInt("LOGIN_WINDOW_MINUTES", 15)) * time.Minute,
		LoginBlockTime:  time.Duration(getEnvInt("LOGIN_BLOCK_MINUTES", 15)) * time.Minute,
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

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}