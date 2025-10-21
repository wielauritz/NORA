package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nora-nak/backend/services"
)

// GetSchedulerStatus returns the scheduler status
// GET /v1/scheduler/status?session_id=...
func GetSchedulerStatus(c *fiber.Ctx) error {
	status := services.GetSchedulerStatus()
	return c.JSON(status)
}
