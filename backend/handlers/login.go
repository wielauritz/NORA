package handlers

import (
	"fmt"
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

// TokenResponse represents login response
type TokenResponse struct {
	Message string `json:"message"`
	Token   string `json:"token"`
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
		firstName := strings.Title(strings.ToLower(nameParts[0]))
		lastName := strings.Title(strings.ToLower(nameParts[1]))

		// Hash password
		passwordHash, err := utils.HashPassword(req.Passwort)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"detail": "Failed to hash password",
			})
		}

		// Create new user
		verificationUUID := uuid.New()
		subscriptionUUID := uuid.New().String()
		verificationExpiry := time.Now().Add(24 * time.Hour) // Expires in 24 hours

		user = models.User{
			Mail:               req.Mail,
			PasswordHash:       passwordHash,
			UUID:               verificationUUID,
			VerificationExpiry: &verificationExpiry,
			Verified:           false,
			FirstName:          firstName,
			LastName:           lastName,
			Initials:           string(firstName[0]) + string(lastName[0]),
			SubscriptionUUID:   &subscriptionUUID,
		}

		if err := config.DB.Create(&user).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"detail": "Failed to create user",
			})
		}

		// Send verification email (async)
		emailService := utils.NewEmailService()
		go emailService.SendVerificationEmail(user.Mail, user.FirstName, verificationUUID.String())

		return c.JSON(TokenResponse{
			Message: "Benutzer erstellt. Bitte überprüfen Sie Ihre E-Mail zur Verifizierung.",
			Token:   "",
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
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"detail": "E-Mail-Adresse noch nicht verifiziert.",
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
	verificationUUID := c.Query("uuid")
	if verificationUUID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "UUID required",
		})
	}

	// Find user with UUID
	var user models.User
	if err := config.DB.Where("uuid = ?", verificationUUID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "Code Ungueltig.",
		})
	}

	// Check if verification link has expired
	if user.VerificationExpiry != nil && time.Now().After(*user.VerificationExpiry) {
		return c.Type("html").SendString(getExpiredVerificationPage())
	}

	// Create session (for auto-login)
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

	// If already verified, just return success page
	if user.Verified {
		return c.Type("html").SendString(getVerificationSuccessPage(sessionID, user.Mail))
	}

	// Mark user as verified
	user.Verified = true
	user.UUID = uuid.Nil          // Clear UUID
	user.VerificationExpiry = nil // Clear expiry
	config.DB.Save(&user)

	return c.Type("html").SendString(getVerificationSuccessPage(sessionID, user.Mail))
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

	// Generate reset UUID
	resetUUID := uuid.New().String()
	user.ResetUUID = &resetUUID
	config.DB.Save(&user)

	// Send reset email (async)
	emailService := utils.NewEmailService()
	go emailService.SendPasswordResetEmail(user.Mail, user.FirstName, resetUUID)

	return c.SendStatus(fiber.StatusNoContent)
}

// ShowPasswordResetForm shows HTML form for password reset
// GET /v1/reset-password?uuid=...
func ShowPasswordResetForm(c *fiber.Ctx) error {
	resetUUID := c.Query("uuid")
	if resetUUID == "" {
		return c.Type("html").SendString(getInvalidResetCode())
	}

	// Find user with reset UUID
	var user models.User
	if err := config.DB.Where("reset_uuid = ?", resetUUID).First(&user).Error; err != nil {
		return c.Type("html").SendString(getInvalidResetCode())
	}

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

	// Hash new password
	passwordHash, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to hash password",
		})
	}

	// Update password and clear reset UUID
	user.PasswordHash = passwordHash
	user.ResetUUID = nil
	config.DB.Save(&user)

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

	// Generate new verification UUID and expiry
	newUUID := uuid.New()
	verificationExpiry := time.Now().Add(24 * time.Hour) // Expires in 24 hours
	user.UUID = newUUID
	user.VerificationExpiry = &verificationExpiry
	config.DB.Save(&user)

	// Send verification email (async)
	emailService := utils.NewEmailService()
	go emailService.SendVerificationEmail(user.Mail, user.FirstName, newUUID.String())

	return c.JSON(fiber.Map{
		"message": "Verifizierungs-E-Mail wurde erneut gesendet. Bitte überprüfen Sie Ihre E-Mails.",
	})
}

// HTML Templates (simplified versions - should be in separate files in production)

func getVerificationSuccessPage(sessionID, email string) string {
	// Redirect to new Ionic app with token as query parameter
	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <title>E-Mail bestätigt - NORA</title>
    <meta charset="UTF-8">
    <script>
        window.onload = function() {
            // Save token to localStorage
            localStorage.setItem('token', '%s');
            localStorage.setItem('user', JSON.stringify({mail: '%s'}));
            // Redirect to dashboard
            window.location.href = 'https://new.nora-nak.de/dashboard';
        };
    </script>
</head>
<body>
    <h1>E-Mail erfolgreich bestätigt!</h1>
    <p>Sie werden zum Dashboard weitergeleitet...</p>
</body>
</html>
`, sessionID, email)
}

func getInvalidResetCode() string {
	return `
<!DOCTYPE html>
<html>
<head>
    <title>Ungültiger Code - NORA</title>
    <meta charset="UTF-8">
</head>
<body>
    <h1>Ungültiger Reset-Code</h1>
    <p>Dieser Link ist ungültig oder abgelaufen.</p>
    <a href="https://new.nora-nak.de">Zurück zur Startseite</a>
</body>
</html>
`
}

func getExpiredVerificationPage() string {
	return `
<!DOCTYPE html>
<html>
<head>
    <title>Verifizierung abgelaufen - NORA</title>
    <meta charset="UTF-8">
    <style>
        body {font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;}
        h1 {color: #d32f2f;}
        p {line-height: 1.6; color: #555;}
        a {color: #667eea; text-decoration: none; font-weight: bold;}
        a:hover {text-decoration: underline;}
        .info-box {background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;}
    </style>
</head>
<body>
    <h1>Verifizierungs-Link abgelaufen</h1>
    <p>Dieser Verifizierungs-Link ist leider abgelaufen. Verifikations-Links sind aus Sicherheitsgründen nur 24 Stunden gültig.</p>
    <div class="info-box">
        <p><strong>Was können Sie tun?</strong></p>
        <p>Bitte loggen Sie sich erneut ein, um einen neuen Verifizierungs-Link zu erhalten, oder fordern Sie eine neue Verifizierungs-E-Mail an.</p>
    </div>
    <a href="https://new.nora-nak.de">Zurück zur Startseite</a>
</body>
</html>
`
}

func getHTMLResetForm(resetUUID string) string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <title>Passwort zurücksetzen - NORA</title>
    <meta charset="UTF-8">
    <style>
        body {font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px;}
        input {width: 100%%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px;}
        button {background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 12px 30px; border: none; border-radius: 4px; cursor: pointer; width: 100%%;}
        button:hover {opacity: 0.9;}
    </style>
</head>
<body>
    <h1>Passwort zurücksetzen</h1>
    <form id="resetForm">
        <input type="password" id="password" placeholder="Neues Passwort" required minlength="8">
        <input type="password" id="confirmPassword" placeholder="Passwort bestätigen" required minlength="8">
        <button type="submit">Passwort zurücksetzen</button>
    </form>
    <script>
        document.getElementById('resetForm').onsubmit = async function(e) {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirmPassword').value;

            if (password !== confirm) {
                alert('Passwörter stimmen nicht überein!');
                return;
            }

            const response = await fetch('/v1/reset-confirm', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({uuid: '%s', new_password: password})
            });

            const data = await response.json();
            if (data.token) {
                // Save token and redirect to new Ionic app
                localStorage.setItem('token', data.token);
                window.location.href = 'https://new.nora-nak.de/dashboard';
            } else {
                alert('Fehler beim Zurücksetzen des Passworts');
            }
        };
    </script>
</body>
</html>
`, resetUUID)
}
