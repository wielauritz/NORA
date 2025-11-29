package adminservice

import (
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/nora-nak/backend/models"
	"github.com/nora-nak/backend/utils"
	"gorm.io/gorm"
)

type AdminHandler struct {
	DB *gorm.DB
}

func NewAdminHandler(db *gorm.DB) *AdminHandler {
	return &AdminHandler{DB: db}
}

// GetDashboardStats returns statistics for the admin dashboard
// GET /v1/admin/stats
func (h *AdminHandler) GetDashboardStats(c *fiber.Ctx) error {
	var userCount int64
	var customHourCount int64
	var examCount int64

	if err := h.DB.Model(&models.User{}).Count(&userCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to count users",
		})
	}

	if err := h.DB.Model(&models.CustomHour{}).Count(&customHourCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to count custom hours",
		})
	}

	if err := h.DB.Model(&models.Exam{}).Count(&examCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to count exams",
		})
	}

	return c.JSON(fiber.Map{
		"user_count":        userCount,
		"custom_hour_count": customHourCount,
		"exam_count":        examCount,
	})
}

// GetUsers returns a list of users with pagination and search
// GET /v1/admin/users
func (h *AdminHandler) GetUsers(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	search := c.Query("search", "")

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	offset := (page - 1) * limit

	var users []models.User
	var total int64

	query := h.DB.Model(&models.User{})

	if search != "" {
		searchTerm := "%" + search + "%"
		query = query.Where("first_name ILIKE ? OR last_name ILIKE ? OR mail ILIKE ?", searchTerm, searchTerm, searchTerm)
	}

	if err := query.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to count users",
		})
	}

	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to fetch users",
		})
	}

	return c.JSON(fiber.Map{
		"users": users,
		"meta": fiber.Map{
			"total": total,
			"page":  page,
			"limit": limit,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// verifyAdminPassword checks if the provided password matches the current admin user's password
func (h *AdminHandler) verifyAdminPassword(c *fiber.Ctx, password string) error {
	// Get current user from context (set by AuthMiddleware)
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return fmt.Errorf("user not authenticated")
	}

	if !user.IsAdmin {
		return fmt.Errorf("user is not an admin")
	}

	if password == "" {
		return fmt.Errorf("password required")
	}

	// Verify password
	if !utils.CheckPasswordHash(password, user.PasswordHash) {
		return fmt.Errorf("invalid password")
	}

	return nil
}

// PromoteToAdmin promotes a user to admin
// PUT /v1/admin/users/:id/promote
func (h *AdminHandler) PromoteToAdmin(c *fiber.Ctx) error {
	var input struct {
		AdminPassword string `json:"admin_password"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid request body",
		})
	}

	// Verify admin password
	if err := h.verifyAdminPassword(c, input.AdminPassword); err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"detail": "Authentication failed: " + err.Error(),
		})
	}

	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid user ID",
		})
	}

	var user models.User
	if err := h.DB.First(&user, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "User not found",
		})
	}

	if user.IsAdmin {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "User is already an admin",
		})
	}

	user.IsAdmin = true
	if err := h.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to promote user",
		})
	}

	return c.JSON(fiber.Map{
		"message": fmt.Sprintf("User %s %s promoted to admin", user.FirstName, user.LastName),
		"user":    user,
	})
}

// DeleteUser deletes a user
// DELETE /v1/admin/users/:id
func (h *AdminHandler) DeleteUser(c *fiber.Ctx) error {
	var input struct {
		AdminPassword string `json:"admin_password"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid request body",
		})
	}

	// Verify admin password
	if err := h.verifyAdminPassword(c, input.AdminPassword); err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"detail": "Authentication failed: " + err.Error(),
		})
	}

	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid user ID",
		})
	}

	if err := h.DB.Delete(&models.User{}, id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to delete user",
		})
	}

	return c.JSON(fiber.Map{
		"message": "User deleted successfully",
	})
}

// VerifyUser toggles user verification status
// PUT /v1/admin/users/:id/verify
func (h *AdminHandler) VerifyUser(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid user ID",
		})
	}

	var input struct {
		Verified      bool   `json:"verified"`
		AdminPassword string `json:"admin_password"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid request body",
		})
	}

	// Verify admin password
	if err := h.verifyAdminPassword(c, input.AdminPassword); err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"detail": "Authentication failed: " + err.Error(),
		})
	}

	var user models.User
	if err := h.DB.First(&user, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "User not found",
		})
	}

	user.Verified = input.Verified
	if err := h.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to update user verification",
		})
	}

	return c.JSON(fiber.Map{
		"message": "User verification updated",
		"user":    user,
	})
}

// UpdateUser updates user details
// PUT /v1/admin/users/:id
func (h *AdminHandler) UpdateUser(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid user ID",
		})
	}

	var input struct {
		FirstName     string `json:"first_name"`
		LastName      string `json:"last_name"`
		Mail          string `json:"mail"`
		Initials      string `json:"initials"`
		AdminPassword string `json:"admin_password"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid request body",
		})
	}

	// Verify admin password
	if err := h.verifyAdminPassword(c, input.AdminPassword); err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"detail": "Authentication failed: " + err.Error(),
		})
	}

	var user models.User
	if err := h.DB.First(&user, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "User not found",
		})
	}

	user.FirstName = input.FirstName
	user.LastName = input.LastName
	user.Mail = input.Mail
	user.Initials = input.Initials

	if err := h.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to update user",
		})
	}

	return c.JSON(fiber.Map{
		"message": "User updated successfully",
		"user":    user,
	})
}

// ResetUserPassword resets a user's password
// POST /v1/admin/users/:id/reset-password
func (h *AdminHandler) ResetUserPassword(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid user ID",
		})
	}

	var input struct {
		NewPassword   string `json:"new_password"`
		AdminPassword string `json:"admin_password"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid request body",
		})
	}

	// Verify admin password
	if err := h.verifyAdminPassword(c, input.AdminPassword); err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"detail": "Authentication failed: " + err.Error(),
		})
	}

	if len(input.NewPassword) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Password must be at least 8 characters long",
		})
	}

	var user models.User
	if err := h.DB.First(&user, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "User not found",
		})
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(input.NewPassword)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to hash password",
		})
	}

	user.PasswordHash = hashedPassword
	if err := h.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to update password",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Password reset successfully",
	})
}
