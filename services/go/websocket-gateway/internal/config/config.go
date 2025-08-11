package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Environment string
	Port       string
	RedisURL   string
	NATSURLs   []string
	JWTSecret  string
	
	// WebSocket settings
	ReadBufferSize    int
	WriteBufferSize   int
	HandshakeTimeout  time.Duration
	WriteTimeout      time.Duration
	ReadTimeout       time.Duration
	PongTimeout       time.Duration
	PingPeriod        time.Duration
	MaxMessageSize    int64
	
	// Connection limits
	MaxConnections         int
	MaxConnectionsPerUser  int
	MaxConnectionsPerIP    int
	
	// Room settings
	MaxRoomSize           int
	RoomIdleTimeout       time.Duration
	
	// Rate limiting
	MessageRateLimit      int
	MessageRateWindow     time.Duration
	
	// Metrics
	MetricsEnabled        bool
	MetricsUpdateInterval time.Duration
}

func Load() *Config {
	return &Config{
		Environment: getEnv("ENVIRONMENT", "development"),
		Port:       getEnv("PORT", "8084"),
		RedisURL:   getEnv("REDIS_URL", "redis://localhost:6379"),
		NATSURLs:   strings.Split(getEnv("NATS_URLS", "nats://localhost:4222"), ","),
		JWTSecret:  getEnv("JWT_SECRET", "your-secret-key"),
		
		ReadBufferSize:   getEnvInt("READ_BUFFER_SIZE", 1024),
		WriteBufferSize:  getEnvInt("WRITE_BUFFER_SIZE", 1024),
		HandshakeTimeout: time.Duration(getEnvInt("HANDSHAKE_TIMEOUT_SECONDS", 10)) * time.Second,
		WriteTimeout:     time.Duration(getEnvInt("WRITE_TIMEOUT_SECONDS", 10)) * time.Second,
		ReadTimeout:      time.Duration(getEnvInt("READ_TIMEOUT_SECONDS", 60)) * time.Second,
		PongTimeout:      time.Duration(getEnvInt("PONG_TIMEOUT_SECONDS", 60)) * time.Second,
		PingPeriod:       time.Duration(getEnvInt("PING_PERIOD_SECONDS", 54)) * time.Second,
		MaxMessageSize:   int64(getEnvInt("MAX_MESSAGE_SIZE_BYTES", 512)),
		
		MaxConnections:        getEnvInt("MAX_CONNECTIONS", 10000),
		MaxConnectionsPerUser: getEnvInt("MAX_CONNECTIONS_PER_USER", 5),
		MaxConnectionsPerIP:   getEnvInt("MAX_CONNECTIONS_PER_IP", 20),
		
		MaxRoomSize:     getEnvInt("MAX_ROOM_SIZE", 1000),
		RoomIdleTimeout: time.Duration(getEnvInt("ROOM_IDLE_TIMEOUT_MINUTES", 30)) * time.Minute,
		
		MessageRateLimit:  getEnvInt("MESSAGE_RATE_LIMIT", 60),
		MessageRateWindow: time.Duration(getEnvInt("MESSAGE_RATE_WINDOW_SECONDS", 60)) * time.Second,
		
		MetricsEnabled:        getEnvBool("METRICS_ENABLED", true),
		MetricsUpdateInterval: time.Duration(getEnvInt("METRICS_UPDATE_INTERVAL_SECONDS", 30)) * time.Second,
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