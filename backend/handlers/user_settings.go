package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/middleware"
	"github.com/nora-nak/backend/models"
	"gorm.io/gorm"
)

// UserSettingsRequest represents the request body for updating user settings
type UserSettingsRequest struct {
	ZenturieID             *uint   `json:"zenturie_id"`
	Theme                  *string `json:"theme"`
	NotificationPreference *string `json:"notification_preference"`
}

// UserSettingsResponse represents the response for user settings
type UserSettingsResponse struct {
	ZenturieID             *uint  `json:"zenturie_id"`
	Theme                  string `json:"theme"`
	NotificationPreference string `json:"notification_preference"`
}

// GetUserSettings retrieves all user settings
// GET /v1/user_settings
func GetUserSettings(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"detail": "Unauthorized",
		})
	}

	// Get user settings from database
	var settings models.UserSettings
	err := config.DB.Where("user_id = ?", user.ID).First(&settings).Error

	// If settings don't exist, create default settings
	if err == gorm.ErrRecordNotFound {
		settings = models.UserSettings{
			UserID:                 user.ID,
			Theme:                  "auto",
			NotificationPreference: "beide",
		}
		if err := config.DB.Create(&settings).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"detail": "Failed to create default settings",
			})
		}
	} else if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to retrieve settings",
		})
	}

	// Return combined settings
	return c.JSON(UserSettingsResponse{
		ZenturieID:             user.ZenturienID,
		Theme:                  settings.Theme,
		NotificationPreference: settings.NotificationPreference,
	})
}

// UpdateUserSettings updates user settings
// POST /v1/user_settings
func UpdateUserSettings(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"detail": "Unauthorized",
		})
	}

	var req UserSettingsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid request body",
		})
	}

	// Validate theme if provided
	if req.Theme != nil {
		validThemes := map[string]bool{"auto": true, "hell": true, "dunkel": true}
		if !validThemes[*req.Theme] {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"detail": "Invalid theme. Must be one of: auto, hell, dunkel",
			})
		}
	}

	// Validate notification preference if provided
	if req.NotificationPreference != nil {
		validPrefs := map[string]bool{"email": true, "mobile": true, "beide": true, "keine": true}
		if !validPrefs[*req.NotificationPreference] {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"detail": "Invalid notification preference. Must be one of: email, mobile, beide, keine",
			})
		}
	}

	// Update zenturie in users table if provided
	if req.ZenturieID != nil {
		// Validate zenturie exists if not nil
		if *req.ZenturieID != 0 {
			var zenturie models.Zenturie
			if err := config.DB.First(&zenturie, *req.ZenturieID).Error; err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"detail": "Invalid zenturie_id",
				})
			}
		}

		user.ZenturienID = req.ZenturieID
		if err := config.DB.Model(&user).Update("zenturien_id", req.ZenturieID).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"detail": "Failed to update zenturie",
			})
		}
	}

	// Get or create user settings
	var settings models.UserSettings
	err := config.DB.Where("user_id = ?", user.ID).First(&settings).Error

	if err == gorm.ErrRecordNotFound {
		// Create new settings
		settings = models.UserSettings{
			UserID:                 user.ID,
			Theme:                  "auto",
			NotificationPreference: "beide",
		}
		if err := config.DB.Create(&settings).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"detail": "Failed to create settings",
			})
		}
	} else if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to retrieve settings",
		})
	}

	// Update theme if provided
	if req.Theme != nil {
		settings.Theme = *req.Theme
	}

	// Update notification preference if provided
	if req.NotificationPreference != nil {
		settings.NotificationPreference = *req.NotificationPreference
	}

	// Save settings
	if err := config.DB.Save(&settings).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to update settings",
		})
	}

	return c.JSON(MessageResponse{
		Message: "Settings updated successfully",
	})
}
