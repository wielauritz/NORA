package config

import (
	"os"
	"time"
)

type Config struct {
	// Server
	ServerPort string
	ServerHost string
	Environment string

	// JWT
	JWTSecret          string
	JWTExpirationHours int

	// Email/SMTP
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string

	// Frontend URL for email links
	FrontendURL string

	// Session expiration (days)
	SessionExpirationDays int
}

var AppConfig *Config

// LoadConfig loads configuration from environment variables
func LoadConfig() *Config {
	AppConfig = &Config{
		ServerPort:            getEnvConfig("PORT", "8000"),
		ServerHost:            getEnvConfig("HOST", "0.0.0.0"),
		Environment:           getEnvConfig("ENV", "development"),
		JWTSecret:             getEnvConfig("JWT_SECRET", "your-secret-key-change-in-production"),
		JWTExpirationHours:    168, // 7 days
		SMTPHost:              getEnvConfig("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:              getEnvConfig("SMTP_PORT", "587"),
		SMTPUser:              getEnvConfig("SMTP_USER", ""),
		SMTPPassword:          getEnvConfig("SMTP_PASSWORD", ""),
		SMTPFrom:              getEnvConfig("SMTP_FROM", "nora@nora-nak.de"),
		FrontendURL:           getEnvConfig("FRONTEND_URL", "https://nora-nak.de"),
		SessionExpirationDays: 7,
	}

	return AppConfig
}

// GetSessionExpiration returns the session expiration time
func GetSessionExpiration() time.Time {
	return time.Now().Add(time.Duration(AppConfig.SessionExpirationDays) * 24 * time.Hour)
}

// getEnvConfig retrieves environment variable or returns default value
func getEnvConfig(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
