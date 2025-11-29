package adminservice

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nora-nak/backend/middleware"
	"gorm.io/gorm"
)

func SetupRoutes(app fiber.Router, db *gorm.DB) {
	adminHandler := NewAdminHandler(db)
	admin := app.Group("/v1/admin", middleware.AuthMiddleware, middleware.AdminMiddleware)
	admin.Get("/stats", adminHandler.GetDashboardStats)
	admin.Get("/users", adminHandler.GetUsers)
	admin.Put("/users/:id/promote", adminHandler.PromoteToAdmin)
	admin.Delete("/users/:id", adminHandler.DeleteUser)
	admin.Put("/users/:id/verify", adminHandler.VerifyUser)
	admin.Put("/users/:id", adminHandler.UpdateUser)
	admin.Post("/users/:id/reset-password", adminHandler.ResetUserPassword)
}
