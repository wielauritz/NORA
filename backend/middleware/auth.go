package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/models"
)

func AuthMiddleware(c *fiber.Ctx) error {
	// Session-Token aus dem Authorization Header lesen
	authHeader := c.Get("Authorization")

	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"detail": "Session ID required",
		})
	}

	// Optional: "Bearer " Präfix entfernen, falls vorhanden
	sessionID := strings.TrimPrefix(authHeader, "Bearer ")

	// Find session in database
	var session models.Session
	result := config.DB.Where("session_id = ?", sessionID).First(&session)

	if result.Error != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"detail": "Invalid or expired session",
		})
	}

	// Check if session is expired
	if session.ExpirationDate.Before(time.Now()) {
		// Delete expired session
		config.DB.Delete(&session)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"detail": "Session expired",
		})
	}

	// Get user
	var user models.User
	if err := config.DB.First(&user, session.UserID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"detail": "User not found",
		})
	}

	// Store user in context
	c.Locals("user", &user)
	c.Locals("session", &session)

	return c.Next()
}

func AdminMiddleware(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"detail": "User not authenticated",
		})
	}

	if !user.IsAdmin {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"detail": "Admin access required",
		})
	}

	return c.Next()
}

// GetCurrentUser retrieves the current user from context
func GetCurrentUser(c *fiber.Ctx) *models.User {
	user, ok := c.Locals("user").(*models.User)
	if !ok {
		return nil
	}
	return user
}

// GetCurrentSession retrieves the current session from context
func GetCurrentSession(c *fiber.Ctx) *models.Session {
	session, ok := c.Locals("session").(*models.Session)
	if !ok {
		return nil
	}
	return session
}
