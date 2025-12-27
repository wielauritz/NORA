package handlers

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/models"
	"github.com/nora-nak/backend/services"
)

// CreateTenant creates a new tenant and corresponding Keycloak realm (ADMIN ONLY)
func CreateTenant(c *fiber.Ctx) error {
	var req struct {
		Name string `json:"name" validate:"required,min=3,max=255"`
		Slug string `json:"slug" validate:"required,min=3,max=50"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate slug format
	if !isValidSlug(req.Slug) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid slug format. Use lowercase letters, numbers, and hyphens only (3-50 characters).",
		})
	}

	// Check if slug already exists
	var existingTenant models.Tenant
	if err := config.DB.Where("slug = ?", req.Slug).First(&existingTenant).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "Tenant with this slug already exists",
		})
	}

	// Create tenant
	tenant := models.Tenant{
		Name:             req.Name,
		Slug:             req.Slug,
		KeycloakRealmID:  req.Slug + "-realm",
		KeycloakURL:      config.AppConfig.KeycloakURL,
		KeycloakClientID: "nora-frontend",
		IsActive:         true,
	}

	// Create Keycloak realm
	keycloakService := services.NewKeycloakAdminService()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := keycloakService.CreateTenantRealm(ctx, &tenant); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to create Keycloak realm",
			"details": err.Error(),
		})
	}

	// Save tenant to database
	if err := config.DB.Create(&tenant).Error; err != nil {
		// Rollback: delete Keycloak realm if DB save fails
		_ = keycloakService.DeleteTenantRealm(ctx, tenant.KeycloakRealmID)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to save tenant to database",
			"details": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Tenant created successfully",
		"tenant":  tenant,
		"keycloak_url": fmt.Sprintf("%s/realms/%s/account",
			tenant.KeycloakURL, tenant.KeycloakRealmID),
	})
}

// GetAllTenants returns all tenants (ADMIN ONLY)
func GetAllTenants(c *fiber.Ctx) error {
	var tenants []models.Tenant

	if err := config.DB.Find(&tenants).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch tenants",
		})
	}

	return c.JSON(fiber.Map{
		"tenants": tenants,
		"count":   len(tenants),
	})
}

// GetTenant returns a specific tenant (ADMIN ONLY)
func GetTenant(c *fiber.Ctx) error {
	tenantID := c.Params("id")

	var tenant models.Tenant
	if err := config.DB.First(&tenant, tenantID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Tenant not found",
		})
	}

	return c.JSON(tenant)
}

// UpdateTenant updates tenant information (ADMIN ONLY)
func UpdateTenant(c *fiber.Ctx) error {
	tenantID := c.Params("id")

	var req struct {
		Name     string `json:"name"`
		IsActive *bool  `json:"is_active"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	var tenant models.Tenant
	if err := config.DB.First(&tenant, tenantID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Tenant not found",
		})
	}

	// Update fields
	if req.Name != "" {
		tenant.Name = req.Name
	}
	if req.IsActive != nil {
		tenant.IsActive = *req.IsActive
	}

	if err := config.DB.Save(&tenant).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update tenant",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Tenant updated successfully",
		"tenant":  tenant,
	})
}

// DeleteTenant deletes a tenant and its Keycloak realm (ADMIN ONLY - DANGEROUS)
func DeleteTenant(c *fiber.Ctx) error {
	tenantID := c.Params("id")

	var tenant models.Tenant
	if err := config.DB.First(&tenant, tenantID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Tenant not found",
		})
	}

	// Delete Keycloak realm first
	keycloakService := services.NewKeycloakAdminService()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := keycloakService.DeleteTenantRealm(ctx, tenant.KeycloakRealmID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to delete Keycloak realm",
			"details": err.Error(),
		})
	}

	// Delete tenant from database (CASCADE will delete all related data)
	if err := config.DB.Delete(&tenant).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete tenant from database",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Tenant and all associated data deleted successfully",
	})
}

// GetTenantStats returns statistics for a tenant (ADMIN ONLY)
func GetTenantStats(c *fiber.Ctx) error {
	tenantID := c.Params("id")

	var tenant models.Tenant
	if err := config.DB.First(&tenant, tenantID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Tenant not found",
		})
	}

	// Count users
	var userCount int64
	config.DB.Model(&models.User{}).Where("tenant_id = ?", tenant.ID).Count(&userCount)

	// Count zenturien
	var zenturieCount int64
	config.DB.Model(&models.Zenturie{}).Where("tenant_id = ?", tenant.ID).Count(&zenturieCount)

	// Count courses
	var courseCount int64
	config.DB.Model(&models.Course{}).Where("tenant_id = ?", tenant.ID).Count(&courseCount)

	// Count rooms
	var roomCount int64
	config.DB.Model(&models.Room{}).Where("tenant_id = ?", tenant.ID).Count(&roomCount)

	// Count timetable entries
	var timetableCount int64
	config.DB.Model(&models.Timetable{}).Where("tenant_id = ?", tenant.ID).Count(&timetableCount)

	return c.JSON(fiber.Map{
		"tenant_id":   tenant.ID,
		"tenant_name": tenant.Name,
		"tenant_slug": tenant.Slug,
		"is_active":   tenant.IsActive,
		"stats": fiber.Map{
			"users":      userCount,
			"zenturien":  zenturieCount,
			"courses":    courseCount,
			"rooms":      roomCount,
			"timetables": timetableCount,
		},
		"created_at": tenant.CreatedAt,
		"updated_at": tenant.UpdatedAt,
	})
}

// isValidSlug validates slug format
// Rules: 3-50 characters, lowercase letters, numbers, and hyphens only
func isValidSlug(slug string) bool {
	if len(slug) < 3 || len(slug) > 50 {
		return false
	}

	// Must start with letter
	if !regexp.MustCompile(`^[a-z]`).MatchString(slug) {
		return false
	}

	// Only lowercase letters, numbers, and hyphens
	if !regexp.MustCompile(`^[a-z0-9-]+$`).MatchString(slug) {
		return false
	}

	// No consecutive hyphens
	if strings.Contains(slug, "--") {
		return false
	}

	// No trailing hyphen
	if strings.HasSuffix(slug, "-") {
		return false
	}

	return true
}
