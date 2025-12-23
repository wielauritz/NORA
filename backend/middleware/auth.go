package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nora-nak/backend/models"
)

// AuthMiddleware - DEPRECATED: Will be replaced with KeycloakAuthMiddleware in Phase 2
// Temporarily disabled during migration to Keycloak
func AuthMiddleware(c *fiber.Ctx) error {
	return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
		"error": "Authentication system is being migrated to Keycloak. Please use the new authentication endpoints.",
	})
}

// GetCurrentUser retrieves the current user from context
func GetCurrentUser(c *fiber.Ctx) *models.User {
	user, ok := c.Locals("user").(*models.User)
	if !ok {
		return nil
	}
	return user
}

// GetCurrentTenant retrieves the current tenant from context
func GetCurrentTenant(c *fiber.Ctx) *models.Tenant {
	tenant, ok := c.Locals("tenant").(*models.Tenant)
	if !ok {
		return nil
	}
	return tenant
}

// GetCurrentTenantID retrieves the current tenant ID from context
func GetCurrentTenantID(c *fiber.Ctx) uint {
	tenantID, ok := c.Locals("tenant_id").(uint)
	if !ok {
		return 0
	}
	return tenantID
}
