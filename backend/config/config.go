package config

import (
	"os"
)

type Config struct {
	// Server
	ServerPort  string
	ServerHost  string
	Environment string

	// Keycloak
	KeycloakURL           string
	KeycloakAdminUser     string
	KeycloakAdminPassword string
	KeycloakMasterRealm   string

	// Multi-Tenancy
	DefaultTenantSlug     string
	EnableTenantSubdomain bool

	// Email/SMTP (optional - Keycloak can handle emails)
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string
	TeamEmail    string

	// Frontend URL for email links
	FrontendURL string

	// ICS Import
	ICSBaseURL string

	// Logging
	LogLevel string // debug, info, warning, error
}

var AppConfig *Config

// LoadConfig loads configuration from environment variables
func LoadConfig() *Config {
	AppConfig = &Config{
		ServerPort:  getEnvConfig("PORT", "8000"),
		ServerHost:  getEnvConfig("HOST", "0.0.0.0"),
		Environment: getEnvConfig("ENV", "development"),

		// Keycloak
		KeycloakURL:           getEnvConfig("KEYCLOAK_URL", "http://localhost:8080"),
		KeycloakAdminUser:     getEnvConfig("KEYCLOAK_ADMIN_USER", "admin"),
		KeycloakAdminPassword: getEnvConfig("KEYCLOAK_ADMIN_PASSWORD", ""),
		KeycloakMasterRealm:   getEnvConfig("KEYCLOAK_MASTER_REALM", "master"),

		// Multi-Tenancy
		DefaultTenantSlug:     getEnvConfig("DEFAULT_TENANT_SLUG", "default"),
		EnableTenantSubdomain: getEnvConfig("ENABLE_TENANT_SUBDOMAIN", "false") == "true",

		// Email/SMTP
		SMTPHost:     getEnvConfig("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:     getEnvConfig("SMTP_PORT", "587"),
		SMTPUser:     getEnvConfig("SMTP_USER", ""),
		SMTPPassword: getEnvConfig("SMTP_PASSWORD", ""),
		SMTPFrom:     getEnvConfig("SMTP_FROM", "nora@nora-nak.de"),
		TeamEmail:    getEnvConfig("TEAM_EMAIL", "team@nora-nak.de"),

		FrontendURL: getEnvConfig("FRONTEND_URL", "https://nora-nak.de"),
		ICSBaseURL:  getEnvConfig("ICS_BASE_URL", "https://cis.nordakademie.de/fileadmin/Infos/Stundenplaene"),
		LogLevel:    getEnvConfig("LOG_LEVEL", "info"),
	}

	return AppConfig
}

// getEnvConfig retrieves environment variable or returns default value
func getEnvConfig(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
