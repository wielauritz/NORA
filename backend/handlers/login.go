package handlers

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/models"
	"github.com/nora-nak/backend/utils"
)

// LoginRequest represents login request body
type LoginRequest struct {
	Mail     string `json:"mail" validate:"required,email"`
	Passwort string `json:"passwort" validate:"required"`
}

// ResetRequest represents password reset request
type ResetRequest struct {
	Mail string `json:"mail" validate:"required,email"`
}

// ResetPasswordRequest represents password reset confirmation
type ResetPasswordRequest struct {
	UUID        string `json:"uuid" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

// VerifyCodeRequest represents email verification code request
type VerifyCodeRequest struct {
	Mail string `json:"mail" validate:"required,email"`
	Code string `json:"code" validate:"required,len=6"`
}

// ResetPasswordWithCodeRequest represents password reset with code
type ResetPasswordWithCodeRequest struct {
	Mail        string `json:"mail" validate:"required,email"`
	Code        string `json:"code" validate:"required,len=6"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

// TokenResponse represents login response
type TokenResponse struct {
	Message  string `json:"message"`
	Token    string `json:"token"`
	AuthMode string `json:"auth_mode,omitempty"`
}

// Login handles user login with auto-registration
// POST /v1/login
func Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid request body",
		})
	}

	// Normalize email to lowercase
	req.Mail = strings.ToLower(req.Mail)

	// Find user in database
	var user models.User
	result := config.DB.Where("mail = ?", req.Mail).First(&user)

	// Auto-registration for @nordakademie.de emails
	if result.Error != nil && strings.HasSuffix(req.Mail, "@nordakademie.de") {
		// Parse email: firstname.lastname@nordakademie.de
		emailParts := strings.Split(req.Mail, "@")
		if len(emailParts) != 2 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"detail": "E-Mail muss im Format vorname.nachname@nordakademie.de sein",
			})
		}

		localPart := emailParts[0]
		nameParts := strings.Split(localPart, ".")

		if len(nameParts) != 2 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"detail": "E-Mail muss im Format vorname.nachname@nordakademie.de sein",
			})
		}

		// Capitalize names
		firstName := strings.Title(strings.ReplaceAll(strings.ToLower(nameParts[0]), "-", " "))
		lastName := strings.Title(strings.ToLower(nameParts[1]))

		// Hash password
		passwordHash, err := utils.HashPassword(req.Passwort)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"detail": "Failed to hash password",
			})
		}

		// Create new user
		verificationCode, err := utils.GenerateVerificationCode()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"detail": "Fehler beim Generieren des Verifizierungscodes",
			})
		}
		subscriptionUUID := uuid.New().String()
		verificationExpiry := time.Now().Add(24 * time.Hour) // Expires in 24 hours

		user = models.User{
			Mail:               req.Mail,
			PasswordHash:       passwordHash,
			UUID:               uuid.New(), // Keep UUID for other purposes
			VerificationCode:   &verificationCode,
			VerificationExpiry: &verificationExpiry,
			Verified:           false,
			FirstName:          firstName,
			LastName:           lastName,
			Initials:           string(firstName[0]) + string(lastName[0]),
			SubscriptionUUID:   &subscriptionUUID,
		}

		if err := config.DB.Create(&user).Error; err != nil {
			// Check if error is due to duplicate email (race condition or existing user)
			var existingUser models.User
			if err := config.DB.Where("mail = ?", req.Mail).First(&existingUser).Error; err == nil {
				// User already exists - check if verified
				if !existingUser.Verified {
					// User exists but is not verified - resend verification code
					newCode, err := utils.GenerateVerificationCode()
					if err == nil {
						newVerificationExpiry := time.Now().Add(24 * time.Hour)
						existingUser.VerificationCode = &newCode
						existingUser.VerificationExpiry = &newVerificationExpiry
						config.DB.Save(&existingUser)

						// Get AUTH_MODE from environment
						authMode := os.Getenv("AUTH_MODE")
						if authMode == "" {
							authMode = "BOTH"
						}

						emailService := utils.NewEmailService()
						go emailService.SendVerificationEmail(existingUser.Mail, existingUser.FirstName, existingUser.UUID.String(), newCode, authMode)
					}

					return c.Status(fiber.StatusConflict).JSON(fiber.Map{
						"detail": "Benutzer existiert bereits. Eine neue Verifizierungs-E-Mail wurde gesendet.",
					})
				}
				// User exists and is verified
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"detail": "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits. Bitte melde dich an.",
				})
			}

			// Some other database error occurred
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"detail": "Fehler beim Erstellen des Benutzers",
			})
		}

		// Get AUTH_MODE from environment
		authMode := os.Getenv("AUTH_MODE")
		if authMode == "" {
			authMode = "BOTH"
		}

		// Send verification email (async) with auth mode
		emailService := utils.NewEmailService()
		go emailService.SendVerificationEmail(user.Mail, user.FirstName, user.UUID.String(), verificationCode, authMode)

		log.Printf("[LOGIN] New user created, returning auth_mode: %s", authMode)
		return c.JSON(TokenResponse{
			Message:  "Benutzer erstellt. Bitte überprüfe deine E-Mail zur Verifizierung.",
			Token:    "",
			AuthMode: authMode,
		})
	}

	// User not found and not auto-registration case
	if result.Error != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"detail": "Ungültige Zugangsdaten",
		})
	}

	// Check password
	if !utils.CheckPasswordHash(req.Passwort, user.PasswordHash) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"detail": "Ungültige Zugangsdaten",
		})
	}

	// Check if verified
	if !user.Verified {
		// Get AUTH_MODE from environment
		authMode := os.Getenv("AUTH_MODE")
		if authMode == "" {
			authMode = "BOTH"
		}

		log.Printf("[LOGIN] User not verified, returning auth_mode: %s", authMode)
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"detail":    "E-Mail-Adresse noch nicht verifiziert.",
			"auth_mode": authMode,
		})
	}

	// Create session
	sessionID := uuid.New().String()
	expiration := time.Now().Add(24 * time.Hour)

	session := models.Session{
		SessionID:      sessionID,
		UserID:         user.ID,
		ExpirationDate: expiration,
	}

	if err := config.DB.Create(&session).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to create session",
		})
	}

	return c.JSON(TokenResponse{
		Message: "Benutzer eingeloggt",
		Token:   sessionID,
	})
}

// VerifyEmail verifies user email address
// GET /v1/verify?uuid=...
func VerifyEmail(c *fiber.Ctx) error {
	verificationUUIDStr := c.Query("uuid")
	if verificationUUIDStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "UUID required",
		})
	}

	// Parse UUID string to uuid.UUID type
	verificationUUID, err := uuid.Parse(verificationUUIDStr)
	if err != nil {
		fmt.Printf("[VERIFY] Invalid UUID format: %s, error: %v\n", verificationUUIDStr, err)
		return c.Type("html").SendString(getInvalidVerificationCode())
	}

	fmt.Printf("[VERIFY] Looking for user with UUID: %s\n", verificationUUID.String())

	// Detect email scanners (Outlook SafeLinks, Google, etc.)
	userAgent := c.Get("User-Agent")
	isScanner := isEmailScanner(userAgent)
	if isScanner {
		fmt.Printf("[VERIFY] Email scanner detected (User-Agent: %s) - returning preview without verifying\n", userAgent)
		// Return a neutral page for scanners without verifying the user
		return c.Type("html").SendString(getEmailScannerPreviewPage())
	}

	// Find user with UUID
	var user models.User
	if err := config.DB.Where("uuid = ?", verificationUUID).First(&user).Error; err != nil {
		fmt.Printf("[VERIFY] User not found with UUID: %s, error: %v\n", verificationUUID.String(), err)
		return c.Type("html").SendString(getInvalidVerificationCode())
	}

	fmt.Printf("[VERIFY] User found: %s, Verified: %v, User-Agent: %s\n", user.Mail, user.Verified, userAgent)

	// Check if already verified - link has already been used
	if user.Verified {
		fmt.Printf("[VERIFY] Link already used - user already verified: %s\n", user.Mail)
		return c.Type("html").SendString(getInvalidVerificationCode())
	}

	// Check if verification link has expired
	if user.VerificationExpiry != nil && time.Now().After(*user.VerificationExpiry) {
		fmt.Printf("[VERIFY] Verification link expired for user: %s\n", user.Mail)
		return c.Type("html").SendString(getExpiredVerificationPage())
	}

	// Mark user as verified
	user.Verified = true
	user.VerificationExpiry = nil
	config.DB.Save(&user)

	fmt.Printf("[VERIFY] User verified successfully: %s\n", user.Mail)

	// Delete UUID after 2 minutes (async) - prevents pre-checking by email scanners
	userID := user.ID
	go func() {
		time.Sleep(2 * time.Minute)
		var u models.User
		if err := config.DB.First(&u, userID).Error; err == nil {
			u.UUID = uuid.Nil
			config.DB.Save(&u)
			fmt.Printf("[VERIFY] UUID deleted after 2 minutes for user ID: %d\n", userID)
		}
	}()

	// Create session for auto-login
	sessionID := uuid.New().String()
	expiration := time.Now().Add(24 * time.Hour)

	session := models.Session{
		SessionID:      sessionID,
		UserID:         user.ID,
		ExpirationDate: expiration,
	}

	if err := config.DB.Create(&session).Error; err != nil {
		fmt.Printf("[VERIFY ERROR] Failed to create session: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to create session",
		})
	}

	fmt.Printf("[VERIFY] Session created: %s\n", sessionID)

	// Return success page with redirect to dashboard with token parameter
	return c.Type("html").SendString(getVerificationSuccessPage(sessionID))
}

// VerifyEmailWithCode verifies email using 6-digit code and returns auth token
// POST /v1/verify-code
func VerifyEmailWithCode(c *fiber.Ctx) error {
	var req VerifyCodeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Ungültige Anfrage",
		})
	}

	// Normalize email
	req.Mail = strings.ToLower(req.Mail)

	// Validate request
	if req.Mail == "" || req.Code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "E-Mail und Code sind erforderlich",
		})
	}

	if len(req.Code) != 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Code muss 6 Zeichen lang sein",
		})
	}

	// Find user by email
	var user models.User
	if err := config.DB.Where("mail = ?", req.Mail).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Ungültiger Verifizierungscode",
		})
	}

	// Check if already verified
	if user.Verified {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "E-Mail bereits verifiziert",
		})
	}

	// Check if verification code exists
	if user.VerificationCode == nil || *user.VerificationCode == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Kein Verifizierungscode gefunden",
		})
	}

	// Check if code matches
	if *user.VerificationCode != req.Code {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Ungültiger Verifizierungscode",
		})
	}

	// Check if verification code has expired (24 hours)
	if user.VerificationExpiry != nil && time.Now().After(*user.VerificationExpiry) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Verifizierungscode abgelaufen",
		})
	}

	// Mark user as verified and clear verification code
	user.Verified = true
	user.VerificationCode = nil
	user.VerificationExpiry = nil
	if err := config.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Fehler beim Verifizieren",
		})
	}

	// Create session for auto-login (24 hours validity)
	sessionID := uuid.New().String()
	session := models.Session{
		SessionID:      sessionID,
		UserID:         user.ID,
		ExpirationDate: time.Now().Add(24 * time.Hour),
	}
	if err := config.DB.Create(&session).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Fehler beim Erstellen der Session",
		})
	}

	// Return token for automatic login
	return c.JSON(fiber.Map{
		"message": "E-Mail erfolgreich verifiziert",
		"token":   sessionID,
		"user": fiber.Map{
			"id":         user.ID,
			"mail":       user.Mail,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
		},
	})
}

// RequestPasswordReset requests a password reset
// POST /v1/reset
func RequestPasswordReset(c *fiber.Ctx) error {
	var req ResetRequest
	if err := c.BodyParser(&req); err != nil {
		return c.SendStatus(fiber.StatusNoContent)
	}

	// Normalize email to lowercase
	req.Mail = strings.ToLower(req.Mail)

	// Find user
	var user models.User
	if err := config.DB.Where("mail = ?", req.Mail).First(&user).Error; err != nil {
		// Return 204 even if user not found (security)
		return c.SendStatus(fiber.StatusNoContent)
	}

	// Generate reset code with 1 hour expiry
	resetCode, err := utils.GenerateVerificationCode()
	if err != nil {
		// Return 204 even on error (security - don't reveal email existence)
		return c.SendStatus(fiber.StatusNoContent)
	}

	// Generate reset UUID for link
	resetUUID := uuid.New().String()
	resetExpiry := time.Now().Add(1 * time.Hour) // Expires in 1 hour

	// Store both code and UUID
	user.ResetCode = &resetCode
	user.ResetCodeExpiry = &resetExpiry
	user.ResetUUID = &resetUUID
	user.ResetUUIDExpiry = &resetExpiry
	config.DB.Save(&user)

	// Get AUTH_MODE from environment
	authMode := os.Getenv("AUTH_MODE")
	if authMode == "" {
		authMode = "BOTH"
	}

	// Send unified reset email (async) with auth mode
	emailService := utils.NewEmailService()
	go emailService.SendPasswordResetEmailUnified(user.Mail, user.FirstName, resetUUID, resetCode, authMode)

	return c.SendStatus(fiber.StatusNoContent)
}

// ResetPasswordWithCode resets password using 6-digit code
// POST /v1/reset-password-code
func ResetPasswordWithCode(c *fiber.Ctx) error {
	var req ResetPasswordWithCodeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Ungültige Anfrage",
		})
	}

	// Normalize email
	req.Mail = strings.ToLower(req.Mail)

	// Validate request
	if req.Mail == "" || req.Code == "" || req.NewPassword == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "E-Mail, Code und neues Passwort sind erforderlich",
		})
	}

	if len(req.Code) != 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Code muss 6 Zeichen lang sein",
		})
	}

	if len(req.NewPassword) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Passwort muss mindestens 8 Zeichen lang sein",
		})
	}

	// Find user by email
	var user models.User
	if err := config.DB.Where("mail = ?", req.Mail).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Ungültiger Reset-Code",
		})
	}

	// Check if reset code exists
	if user.ResetCode == nil || *user.ResetCode == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Kein Reset-Code gefunden",
		})
	}

	// Check if code matches
	if *user.ResetCode != req.Code {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Ungültiger Reset-Code",
		})
	}

	// Check if reset code has expired (1 hour)
	if user.ResetCodeExpiry != nil && time.Now().After(*user.ResetCodeExpiry) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Reset-Code abgelaufen",
		})
	}

	// Hash new password
	passwordHash, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Fehler beim Setzen des Passworts",
		})
	}

	// Update password and clear reset code
	user.PasswordHash = passwordHash
	user.ResetCode = nil
	user.ResetCodeExpiry = nil
	if err := config.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Fehler beim Speichern",
		})
	}

	// Create session for auto-login (24 hours validity)
	sessionID := uuid.New().String()
	session := models.Session{
		SessionID:      sessionID,
		UserID:         user.ID,
		ExpirationDate: time.Now().Add(24 * time.Hour),
	}
	if err := config.DB.Create(&session).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Fehler beim Erstellen der Session",
		})
	}

	// Return success with token for automatic login
	return c.JSON(fiber.Map{
		"message": "Passwort erfolgreich zurückgesetzt",
		"token":   sessionID,
		"user": fiber.Map{
			"id":         user.ID,
			"mail":       user.Mail,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
		},
	})
}

// ShowPasswordResetForm shows HTML form for password reset
// GET /v1/reset-password?uuid=...
func ShowPasswordResetForm(c *fiber.Ctx) error {
	resetUUID := c.Query("uuid")
	if resetUUID == "" {
		return c.Type("html").SendString(getInvalidResetCode())
	}

	// Detect email scanners (Outlook SafeLinks, Google, etc.)
	userAgent := c.Get("User-Agent")
	isScanner := isEmailScanner(userAgent)
	if isScanner {
		log.Printf("[RESET] Email scanner detected (User-Agent: %s) - returning preview without showing reset form\n", userAgent)
		// Return a neutral page for scanners without showing the reset form
		return c.Type("html").SendString(getEmailScannerPreviewPage())
	}

	// Find user with reset UUID
	var user models.User
	if err := config.DB.Where("reset_uuid = ?", resetUUID).First(&user).Error; err != nil {
		return c.Type("html").SendString(getInvalidResetCode())
	}

	// Check if reset link has expired
	if user.ResetUUIDExpiry != nil && time.Now().After(*user.ResetUUIDExpiry) {
		return c.Type("html").SendString(getExpiredResetPage())
	}

	log.Printf("[RESET] Showing password reset form for user: %s, User-Agent: %s\n", user.Mail, userAgent)
	return c.Type("html").SendString(getHTMLResetForm(resetUUID))
}

// ConfirmPasswordReset confirms password reset and auto-login
// POST /v1/reset-confirm
func ConfirmPasswordReset(c *fiber.Ctx) error {
	var req ResetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid request body",
		})
	}

	// Find user with reset UUID
	var user models.User
	if err := config.DB.Where("reset_uuid = ?", req.UUID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "Ungültiger Reset-Code",
		})
	}

	// Check if reset link has expired
	if user.ResetUUIDExpiry != nil && time.Now().After(*user.ResetUUIDExpiry) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"detail": "Reset-Link ist abgelaufen. Bitte fordere einen neuen an.",
		})
	}

	// Hash new password
	passwordHash, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to hash password",
		})
	}

	// Update password and expire reset link immediately (prevents reuse)
	user.PasswordHash = passwordHash
	expiredTime := time.Now().Add(-1 * time.Hour) // Set to past to invalidate immediately
	user.ResetUUIDExpiry = &expiredTime
	config.DB.Save(&user)

	// Delete Reset UUID after 2 minutes (async) - prevents pre-checking by email scanners
	userID := user.ID
	go func() {
		time.Sleep(2 * time.Minute)
		var u models.User
		if err := config.DB.First(&u, userID).Error; err == nil {
			u.ResetUUID = nil
			u.ResetUUIDExpiry = nil
			config.DB.Save(&u)
			fmt.Printf("[RESET] Reset UUID deleted after 2 minutes for user ID: %d\n", userID)
		}
	}()

	// Create session (auto-login)
	sessionID := uuid.New().String()
	expiration := time.Now().Add(24 * time.Hour)

	session := models.Session{
		SessionID:      sessionID,
		UserID:         user.ID,
		ExpirationDate: expiration,
	}

	if err := config.DB.Create(&session).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to create session",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Passwort erfolgreich zurückgesetzt",
		"token":   sessionID,
	})
}

// ResendVerificationEmail resends verification email
// POST /v1/resend-email
func ResendVerificationEmail(c *fiber.Ctx) error {
	var req ResetRequest
	if err := c.BodyParser(&req); err != nil {
		return c.SendStatus(fiber.StatusNoContent)
	}

	// Normalize email to lowercase
	req.Mail = strings.ToLower(req.Mail)

	var user models.User
	if err := config.DB.Where("mail = ?", req.Mail).First(&user).Error; err != nil {
		return c.SendStatus(fiber.StatusNoContent)
	}

	// Only resend if user is not verified
	if user.Verified {
		return c.SendStatus(fiber.StatusNoContent)
	}

	// Generate new verification code and expiry
	newCode, err := utils.GenerateVerificationCode()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Fehler beim Generieren des Verifizierungscodes",
		})
	}
	verificationExpiry := time.Now().Add(24 * time.Hour) // Expires in 24 hours
	user.VerificationCode = &newCode
	user.VerificationExpiry = &verificationExpiry
	config.DB.Save(&user)

	// Get AUTH_MODE from environment
	authMode := os.Getenv("AUTH_MODE")
	if authMode == "" {
		authMode = "BOTH"
	}

	// Send verification email (async)
	emailService := utils.NewEmailService()
	go emailService.SendVerificationEmail(user.Mail, user.FirstName, user.UUID.String(), newCode, authMode)

	return c.JSON(fiber.Map{
		"message": "Verifizierungs-E-Mail wurde erneut gesendet. Bitte überprüfe deine E-Mails.",
	})
}

// HTML Templates (simplified versions - should be in separate files in production)

func getVerificationSuccessPage(sessionID string) string {
	// Simple redirect to dashboard with token as URL parameter
	// Frontend will receive token, store it, and use it for all future requests
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>E-Mail erfolgreich verifiziert</title>
    <script src="https://new.nora-nak.de/js/dark-mode.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://new.nora-nak.de/css/common.css">
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        primary: '#3cd2ff',
                        secondary: '#003a79',
                        accent: '#ffa064',
                    }
                }
            }
        }
    </script>
    <link rel="stylesheet" href="https://new.nora-nak.de/css/common.css">
    <style>
        @keyframes scaleIn {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
            0%% { transform: rotate(0deg); }
            100%% { transform: rotate(360deg); }
        }
        .checkmark-animate {
            animation: scaleIn 0.5s ease-out;
        }
        .spinner {
            border: 3px solid rgba(60, 210, 255, 0.2);
            border-top: 3px solid #3cd2ff;
            border-radius: 50%%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
    </style>
</head>
<body class="bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
            <img src="https://cdn.nora-nak.de/img/logo.png" alt="NORA Logo" class="h-20 mx-auto mb-4">
        </div>

        <!-- Success Card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
            <!-- Success Icon -->
            <div class="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full mb-6 checkmark-animate">
                <svg class="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
            </div>

            <!-- Title -->
            <h1 class="text-2xl font-bold text-secondary dark:text-primary mb-3">E-Mail erfolgreich verifiziert!</h1>

            <!-- Message -->
            <p class="text-gray-600 dark:text-gray-300 mb-6">Du wirst automatisch zum Dashboard weitergeleitet...</p>

            <!-- Spinner -->
            <div class="spinner"></div>
        </div>

        <!-- Footer -->
        <div class="text-center mt-6 text-gray-400 dark:text-gray-500 text-xs space-y-2">
            <p>&copy; 2025 NORA – Nordakademie Organizer & Room Assistant</p>
            <p class="space-x-3">
                <a href="https://new.nora-nak.de/impressum.html" class="hover:text-primary transition-colors">Impressum</a>
                <span>•</span>
                <a href="https://new.nora-nak.de/privacy.html" class="hover:text-primary transition-colors">Datenschutz</a>
            </p>
        </div>
    </div>

    <script>
        // Redirect to dashboard with token as URL parameter
        const token = '%s';
        if (token) {
            // Dashboard will receive token, store it persistently, and use for all requests
            window.location.replace('https://new.nora-nak.de/dashboard.html?token=' + token);
        } else {
            window.location.replace('https://new.nora-nak.de/index.html');
        }
    </script>
</body>
</html>`, sessionID)
}

func getInvalidVerificationCode() string {
	return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Ungültiger Verifizierungs-Link - NORA</title>
    <script src="https://new.nora-nak.de/js/dark-mode.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://new.nora-nak.de/css/common.css">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#3cd2ff',
                        secondary: '#003a79',
                        accent: '#ffa064',
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
            <img src="https://cdn.nora-nak.de/img/logo.png" alt="NORA Logo" class="h-20 mx-auto mb-4">
        </div>

        <!-- Error Card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
            <!-- Error Icon -->
            <div class="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
                <svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </div>

            <!-- Title -->
            <h1 class="text-2xl font-bold text-secondary dark:text-primary mb-3">Ungültiger Verifizierungs-Link</h1>

            <!-- Message -->
            <p class="text-gray-600 dark:text-gray-300 mb-6">Dieser Verifizierungs-Link ist ungültig oder wurde bereits verwendet.</p>

            <!-- Info Box -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 mb-6">
                <p class="font-semibold mb-2">Was kannst du tun?</p>
                <p>Wenn du dich bereits verifiziert hast, kannst du dich jetzt anmelden. Andernfalls fordere bitte eine neue Verifizierungs-E-Mail an.</p>
            </div>

            <!-- Back Button -->
            <a href="https://new.nora-nak.de" class="inline-block btn-hover bg-gradient-to-r from-primary to-secondary text-white py-3 px-8 rounded-lg font-medium hover:opacity-90 transition-opacity">
                Zurück zur Startseite
            </a>
        </div>

        <!-- Footer -->
        <div class="text-center mt-6 text-gray-400 dark:text-gray-500 text-xs space-y-2">
            <p>&copy; 2025 NORA – Nordakademie Organizer & Room Assistant</p>
            <p class="space-x-3">
                <a href="https://new.nora-nak.de/impressum.html" class="hover:text-primary transition-colors">Impressum</a>
                <span>•</span>
                <a href="https://new.nora-nak.de/privacy.html" class="hover:text-primary transition-colors">Datenschutz</a>
            </p>
        </div>
    </div>
</body>
</html>
`
}

func getInvalidResetCode() string {
	return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Ungültiger Reset-Link - NORA</title>
    <script src="https://new.nora-nak.de/js/dark-mode.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://new.nora-nak.de/css/common.css">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#3cd2ff',
                        secondary: '#003a79',
                        accent: '#ffa064',
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
            <img src="https://cdn.nora-nak.de/img/logo.png" alt="NORA Logo" class="h-20 mx-auto mb-4">
        </div>

        <!-- Error Card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
            <!-- Error Icon -->
            <div class="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
                <svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </div>

            <!-- Title -->
            <h1 class="text-2xl font-bold text-secondary dark:text-primary mb-3">Ungültiger Reset-Link</h1>

            <!-- Message -->
            <p class="text-gray-600 dark:text-gray-300 mb-6">Dieser Passwort-Reset-Link ist ungültig oder wurde bereits verwendet.</p>

            <!-- Back Button -->
            <a href="https://new.nora-nak.de/password-reset.html" class="inline-block btn-hover bg-gradient-to-r from-primary to-secondary text-white py-3 px-8 rounded-lg font-medium hover:opacity-90 transition-opacity">
                Neuen Reset-Link anfordern
            </a>
        </div>

        <!-- Footer -->
        <div class="text-center mt-6 text-gray-400 dark:text-gray-500 text-xs space-y-2">
            <p>&copy; 2025 NORA – Nordakademie Organizer & Room Assistant</p>
            <p class="space-x-3">
                <a href="https://new.nora-nak.de/impressum.html" class="hover:text-primary transition-colors">Impressum</a>
                <span>•</span>
                <a href="https://new.nora-nak.de/privacy.html" class="hover:text-primary transition-colors">Datenschutz</a>
            </p>
        </div>
    </div>
</body>
</html>
`
}

func getExpiredVerificationPage() string {
	return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Verifizierungs-Link abgelaufen - NORA</title>
    <script src="https://new.nora-nak.de/js/dark-mode.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://new.nora-nak.de/css/common.css">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#3cd2ff',
                        secondary: '#003a79',
                        accent: '#ffa064',
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
            <img src="https://cdn.nora-nak.de/img/logo.png" alt="NORA Logo" class="h-20 mx-auto mb-4">
        </div>

        <!-- Warning Card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
            <!-- Warning Icon -->
            <div class="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6">
                <svg class="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>

            <!-- Title -->
            <h1 class="text-2xl font-bold text-secondary dark:text-primary mb-3">Verifizierungs-Link abgelaufen</h1>

            <!-- Message -->
            <p class="text-gray-600 dark:text-gray-300 mb-6">Dieser Verifizierungs-Link ist leider abgelaufen. Verifikations-Links sind aus Sicherheitsgründen nur 24 Stunden gültig.</p>

            <!-- Info Box -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 mb-6">
                <p class="font-semibold mb-2">Was kannst du tun?</p>
                <p>Bitte logge dich erneut ein, um einen neuen Verifizierungs-Link zu erhalten.</p>
            </div>

            <!-- Back Button -->
            <a href="https://new.nora-nak.de" class="inline-block btn-hover bg-gradient-to-r from-primary to-secondary text-white py-3 px-8 rounded-lg font-medium hover:opacity-90 transition-opacity">
                Zurück zur Startseite
            </a>
        </div>

        <!-- Footer -->
        <div class="text-center mt-6 text-gray-400 dark:text-gray-500 text-xs space-y-2">
            <p>&copy; 2025 NORA – Nordakademie Organizer & Room Assistant</p>
            <p class="space-x-3">
                <a href="https://new.nora-nak.de/impressum.html" class="hover:text-primary transition-colors">Impressum</a>
                <span>•</span>
                <a href="https://new.nora-nak.de/privacy.html" class="hover:text-primary transition-colors">Datenschutz</a>
            </p>
        </div>
    </div>
</body>
</html>
`
}

func getExpiredResetPage() string {
	return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Passwort-Reset-Link abgelaufen - NORA</title>
    <script src="https://new.nora-nak.de/js/dark-mode.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://new.nora-nak.de/css/common.css">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#3cd2ff',
                        secondary: '#003a79',
                        accent: '#ffa064',
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
            <img src="https://cdn.nora-nak.de/img/logo.png" alt="NORA Logo" class="h-20 mx-auto mb-4">
        </div>

        <!-- Warning Card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
            <!-- Warning Icon -->
            <div class="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6">
                <svg class="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>

            <!-- Title -->
            <h1 class="text-2xl font-bold text-secondary dark:text-primary mb-3">Passwort-Reset-Link abgelaufen</h1>

            <!-- Message -->
            <p class="text-gray-600 dark:text-gray-300 mb-6">Dieser Passwort-Reset-Link ist leider abgelaufen. Reset-Links sind aus Sicherheitsgründen nur 1 Stunde gültig.</p>

            <!-- Info Box -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 mb-6">
                <p class="font-semibold mb-2">Was kannst du tun?</p>
                <p>Bitte fordere einen neuen Passwort-Reset-Link an. Der neue Link wird dir per E-Mail zugesendet.</p>
            </div>

            <!-- Back Button -->
            <a href="https://new.nora-nak.de/password-reset.html" class="inline-block btn-hover bg-gradient-to-r from-primary to-secondary text-white py-3 px-8 rounded-lg font-medium hover:opacity-90 transition-opacity">
                Neuen Reset-Link anfordern
            </a>
        </div>

        <!-- Footer -->
        <div class="text-center mt-6 text-gray-400 dark:text-gray-500 text-xs space-y-2">
            <p>&copy; 2025 NORA – Nordakademie Organizer & Room Assistant</p>
            <p class="space-x-3">
                <a href="https://new.nora-nak.de/impressum.html" class="hover:text-primary transition-colors">Impressum</a>
                <span>•</span>
                <a href="https://new.nora-nak.de/privacy.html" class="hover:text-primary transition-colors">Datenschutz</a>
            </p>
        </div>
    </div>
</body>
</html>
`
}

func getHTMLResetForm(resetUUID string) string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Passwort zurücksetzen - NORA</title>
    <script src="https://new.nora-nak.de/js/dark-mode.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://new.nora-nak.de/css/common.css">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#3cd2ff',
                        secondary: '#003a79',
                        accent: '#ffa064',
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
            <img src="https://cdn.nora-nak.de/img/logo.png" alt="NORA Logo" class="h-20 mx-auto mb-4">
            <p class="text-gray-600 text-sm">Setze dein Passwort zurück</p>
        </div>

        <!-- Reset Form Card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
            <h1 class="text-2xl font-bold text-secondary dark:text-primary mb-6 text-center">Neues Passwort festlegen</h1>

            <form id="resetForm" class="space-y-5">
                <!-- New Password Input -->
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Neues Passwort
                    </label>
                    <input
                        type="password"
                        id="password"
                        required
                        minlength="8"
                        class="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white"
                        placeholder="Mindestens 8 Zeichen"
                    >
                </div>

                <!-- Confirm Password Input -->
                <div>
                    <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Passwort bestätigen
                    </label>
                    <input
                        type="password"
                        id="confirmPassword"
                        required
                        minlength="8"
                        class="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white"
                        placeholder="Passwort wiederholen"
                    >
                </div>

                <!-- Error Message -->
                <div id="errorMsg" class="hidden bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                </div>

                <!-- Submit Button -->
                <button
                    type="submit"
                    class="w-full bg-gradient-to-r from-primary to-secondary text-white py-3 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                    Passwort zurücksetzen
                </button>
            </form>
        </div>

        <!-- Footer -->
        <div class="text-center mt-6 text-gray-400 dark:text-gray-500 text-xs space-y-2">
            <p>&copy; 2025 NORA – Nordakademie Organizer & Room Assistant</p>
            <p class="space-x-3">
                <a href="https://new.nora-nak.de/impressum.html" class="hover:text-primary transition-colors">Impressum</a>
                <span>•</span>
                <a href="https://new.nora-nak.de/privacy.html" class="hover:text-primary transition-colors">Datenschutz</a>
            </p>
        </div>
    </div>

    <script>
        const errorMsg = document.getElementById('errorMsg');

        function showError(msg) {
            errorMsg.textContent = msg;
            errorMsg.classList.remove('hidden');
        }

        function hideError() {
            errorMsg.classList.add('hidden');
        }

        document.getElementById('resetForm').onsubmit = async function(e) {
            e.preventDefault();
            hideError();

            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirmPassword').value;
            const submitBtn = e.target.querySelector('button[type="submit"]');

            if (password !== confirm) {
                showError('Die Passwörter stimmen nicht überein!');
                return;
            }

            if (password.length < 8) {
                showError('Das Passwort muss mindestens 8 Zeichen lang sein.');
                return;
            }

            // Disable button
            submitBtn.disabled = true;
            submitBtn.textContent = 'Wird verarbeitet...';

            try {
                const response = await fetch('/v1/reset-confirm', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({uuid: '%s', new_password: password})
                });

                const data = await response.json();
                if (data.token) {
                    // Save token and redirect
                    localStorage.setItem('token', data.token);
                    submitBtn.textContent = 'Erfolgreich! Weiterleitung...';
                    setTimeout(() => {
                        window.location.href = 'https://new.nora-nak.de/dashboard.html';
                    }, 500);
                } else {
                    showError('Fehler beim Zurücksetzen des Passworts. Bitte versuche es erneut.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Passwort zurücksetzen';
                }
            } catch (error) {
                showError('Ein Fehler ist aufgetreten. Bitte versuche es später erneut.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Passwort zurücksetzen';
            }
        };
    </script>
</body>
</html>
`, resetUUID)
}

// isEmailScanner detects if the request comes from an email scanner
// Common scanners: Outlook SafeLinks, Google URL Scanner, ProofPoint, Mimecast, etc.
func isEmailScanner(userAgent string) bool {
	// Empty or very short User-Agent is often a scanner
	if len(strings.TrimSpace(userAgent)) < 10 {
		return true
	}

	userAgent = strings.ToLower(userAgent)

	// Known email scanner patterns
	scannerPatterns := []string{
		"safelinks",                    // Microsoft SafeLinks
		"microsoft",                    // Microsoft scanners
		"ms-office",                    // Microsoft Office
		"outlook",                      // Outlook
		"google-safety",                // Google Safety scanner
		"proofpoint",                   // ProofPoint URL Defense
		"mimecast",                     // Mimecast URL Protection
		"barracuda",                    // Barracuda scanner
		"webdav",                       // WebDAV MiniRedir
		"existence discovery",          // Microsoft Existence Discovery
		"urldefense",                   // Various URL defense systems
		"link scanner",                 // Generic link scanners
		"security",                     // Security scanners
	}

	for _, pattern := range scannerPatterns {
		if strings.Contains(userAgent, pattern) {
			return true
		}
	}

	return false
}

// getEmailScannerPreviewPage returns a neutral page for email scanners
// This prevents the link from being consumed by pre-checking
func getEmailScannerPreviewPage() string {
	return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NORA - Verifizierung</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #003a79 0%, #0056b3 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            padding: 48px;
            max-width: 500px;
            text-align: center;
        }
        h1 {
            color: #003a79;
            font-size: 28px;
            margin: 0 0 16px 0;
        }
        p {
            color: #666;
            font-size: 16px;
            line-height: 1.6;
            margin: 0;
        }
        .info {
            background: #f0f9ff;
            border-left: 4px solid #3cd2ff;
            padding: 16px;
            margin-top: 24px;
            text-align: left;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>NORA Verifizierung</h1>
        <p>Dieser Link wird in deinem Browser geöffnet.</p>
        <div class="info">
            <p><strong>💡 Hinweis:</strong> Bitte klicke auf den Link in deiner E-Mail, um die Verifizierung abzuschließen.</p>
        </div>
    </div>
</body>
</html>`
}
