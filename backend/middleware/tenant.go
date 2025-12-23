package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/models"
)

// TenantMiddleware extracts tenant from configuration or subdomain and loads tenant config
func TenantMiddleware(c *fiber.Ctx) error {
	var tenantSlug string

	// Check if subdomain-based multi-tenancy is enabled
	if config.AppConfig.EnableTenantSubdomain {
		// Extract tenant from subdomain
		host := c.Hostname() // e.g., "school1.nora-nak.de" or "localhost:8000"
		tenantSlug = extractTenantSlug(host)

		// Fallback for development: X-Tenant-ID header
		if tenantSlug == "" {
			tenantSlug = c.Get("X-Tenant-ID")
		}
	}

	// If subdomain feature is disabled or no tenant found, use default tenant from config
	if tenantSlug == "" {
		tenantSlug = config.AppConfig.DefaultTenantSlug
	}

	if tenantSlug == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Tenant not configured. Set DEFAULT_TENANT_SLUG in .env file.",
		})
	}

	// Load tenant from database
	var tenant models.Tenant
	if err := config.DB.Where("slug = ? AND is_active = ?", tenantSlug, true).First(&tenant).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":       "Tenant not found or inactive",
			"tenant_slug": tenantSlug,
		})
	}

	// Store in context
	c.Locals("tenant", &tenant)
	c.Locals("tenant_id", tenant.ID)

	return c.Next()
}

// extractTenantSlug extracts tenant slug from hostname
// Examples:
//   - "school1.nora-nak.de" -> "school1"
//   - "api.school1.nora-nak.de" -> "school1"
//   - "localhost:8000" -> ""
func extractTenantSlug(host string) string {
	// Remove port if present
	if idx := strings.Index(host, ":"); idx != -1 {
		host = host[:idx]
	}

	// Split by dots
	parts := strings.Split(host, ".")

	// Localhost or single part: no tenant
	if len(parts) < 2 || parts[0] == "localhost" || parts[0] == "127" {
		return ""
	}

	// Handle: api.school1.nora-nak.de → school1
	if parts[0] == "api" && len(parts) >= 3 {
		return parts[1]
	}

	// Handle: school1.nora-nak.de → school1
	return parts[0]
}
