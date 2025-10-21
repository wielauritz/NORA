package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/models"
)

// AuthMiddleware validates session_id from query parameter
func AuthMiddleware(c *fiber.Ctx) error {
	sessionID := c.Query("session_id")

	if sessionID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"detail": "Session ID required",
		})
	}

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
