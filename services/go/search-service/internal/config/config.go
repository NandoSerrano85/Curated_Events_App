package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Environment      string
	Port            string
	ElasticsearchURL string
	JWTSecret       string
	
	// Search configuration
	MaxSearchResults    int
	SearchTimeout       time.Duration
	DefaultFuzziness    string
	
	// Indexing configuration
	IndexRefreshInterval string
	BulkIndexSize       int
	
	// Cache settings
	CacheEnabled    bool
	CacheTTL        time.Duration
	
	// Rate limiting
	SearchRateLimit int
	SearchWindow    time.Duration
}

func Load() *Config {
	return &Config{
		Environment:      getEnv("ENVIRONMENT", "development"),
		Port:            getEnv("PORT", "8083"),
		ElasticsearchURL: getEnv("ELASTICSEARCH_URL", "http://localhost:9200"),
		JWTSecret:       getEnv("JWT_SECRET", "your-secret-key"),
		
		MaxSearchResults:    getEnvInt("MAX_SEARCH_RESULTS", 1000),
		SearchTimeout:       time.Duration(getEnvInt("SEARCH_TIMEOUT_SECONDS", 10)) * time.Second,
		DefaultFuzziness:    getEnv("DEFAULT_FUZZINESS", "AUTO"),
		
		IndexRefreshInterval: getEnv("INDEX_REFRESH_INTERVAL", "1s"),
		BulkIndexSize:       getEnvInt("BULK_INDEX_SIZE", 100),
		
		CacheEnabled: getEnvBool("CACHE_ENABLED", true),
		CacheTTL:     time.Duration(getEnvInt("CACHE_TTL_MINUTES", 10)) * time.Minute,
		
		SearchRateLimit: getEnvInt("SEARCH_RATE_LIMIT", 100),
		SearchWindow:    time.Duration(getEnvInt("SEARCH_WINDOW_MINUTES", 1)) * time.Minute,
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