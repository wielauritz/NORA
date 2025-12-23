package middleware

import (
	"github.com/gofiber/fiber/v2"
)

// RequireRole checks if user has any of the allowed roles
func RequireRole(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRoles := GetCurrentRoles(c)

		// Check if user has any of the allowed roles
		for _, userRole := range userRoles {
			for _, allowedRole := range allowedRoles {
				if userRole == allowedRole {
					return c.Next()
				}
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":          "Insufficient permissions",
			"required_roles": allowedRoles,
			"your_roles":     userRoles,
		})
	}
}

// RequireAdmin requires admin role
func RequireAdmin() fiber.Handler {
	return RequireRole("admin")
}

// RequireTeacher requires admin or teacher role
func RequireTeacher() fiber.Handler {
	return RequireRole("admin", "teacher")
}

// RequireStudent requires student role (or higher)
func RequireStudent() fiber.Handler {
	return RequireRole("admin", "teacher", "student")
}

// RequireSupport requires support role (or admin)
func RequireSupport() fiber.Handler {
	return RequireRole("admin", "support")
}

// GetCurrentRoles retrieves roles from context
func GetCurrentRoles(c *fiber.Ctx) []string {
	roles, ok := c.Locals("roles").([]string)
	if !ok {
		return []string{}
	}
	return roles
}

// HasRole checks if user has a specific role
func HasRole(c *fiber.Ctx, role string) bool {
	roles := GetCurrentRoles(c)
	for _, r := range roles {
		if r == role {
			return true
		}
	}
	return false
}

// HasAnyRole checks if user has any of the specified roles
func HasAnyRole(c *fiber.Ctx, roles ...string) bool {
	userRoles := GetCurrentRoles(c)
	for _, userRole := range userRoles {
		for _, role := range roles {
			if userRole == role {
				return true
			}
		}
	}
	return false
}
