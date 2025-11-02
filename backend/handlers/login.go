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

// VerifyCodeRequest represents email verification code request
type VerifyCodeRequest struct {
	Mail string `json:"mail" validate:"required,email"`
	Code string `json:"code" validate:"required,len=6"`
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

						emailService := utils.NewEmailService()
						go emailService.SendVerificationCodeEmail(existingUser.Mail, existingUser.FirstName, newCode)
					}

					return c.Status(fiber.StatusConflict).JSON(fiber.Map{
						"detail": "Benutzer existiert bereits. Eine neue Verifizierungs-E-Mail wurde gesendet.",
					})
				}
				// User exists and is verified
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"detail": "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits. Bitte melden Sie sich an.",
				})
			}

			// Some other database error occurred
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"detail": "Fehler beim Erstellen des Benutzers",
			})
		}

		// Send verification code email (async)
		emailService := utils.NewEmailService()
		go emailService.SendVerificationCodeEmail(user.Mail, user.FirstName, verificationCode)

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

	// Find user with UUID
	var user models.User
	if err := config.DB.Where("uuid = ?", verificationUUID).First(&user).Error; err != nil {
		fmt.Printf("[VERIFY] User not found with UUID: %s, error: %v\n", verificationUUID.String(), err)
		return c.Type("html").SendString(getInvalidVerificationCode())
	}

	fmt.Printf("[VERIFY] User found: %s, Verified: %v\n", user.Mail, user.Verified)

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

	// Validate request
	if err := validate.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Ungültige Daten",
		})
	}

	// Normalize email
	req.Mail = strings.ToLower(req.Mail)

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

	// Generate reset UUID with 1 hour expiry
	resetUUID := uuid.New().String()
	resetExpiry := time.Now().Add(1 * time.Hour) // Expires in 1 hour
	user.ResetUUID = &resetUUID
	user.ResetUUIDExpiry = &resetExpiry
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

	// Check if reset link has expired
	if user.ResetUUIDExpiry != nil && time.Now().After(*user.ResetUUIDExpiry) {
		return c.Type("html").SendString(getExpiredResetPage())
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

	// Check if reset link has expired
	if user.ResetUUIDExpiry != nil && time.Now().After(*user.ResetUUIDExpiry) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"detail": "Reset-Link ist abgelaufen. Bitte fordern Sie einen neuen an.",
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

	// Send verification code email (async)
	emailService := utils.NewEmailService()
	go emailService.SendVerificationCodeEmail(user.Mail, user.FirstName, newCode)

	return c.JSON(fiber.Map{
		"message": "Verifizierungs-E-Mail wurde erneut gesendet. Bitte überprüfen Sie Ihre E-Mails.",
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-Mail erfolgreich verifiziert</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
            color: white;
            text-align: center;
        }
        .container {
            padding: 2rem;
        }
        .checkmark {
            font-size: 64px;
            margin-bottom: 1rem;
            animation: scaleIn 0.5s ease-out;
        }
        @keyframes scaleIn {
            from { transform: scale(0); }
            to { transform: scale(1); }
        }
        h1 {
            font-size: 24px;
            margin-bottom: 0.5rem;
        }
        p {
            font-size: 14px;
            opacity: 0.9;
        }
        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0%% { transform: rotate(0deg); }
            100%% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="checkmark">✓</div>
        <h1>E-Mail erfolgreich verifiziert!</h1>
        <p>Sie werden zum Dashboard weitergeleitet...</p>
        <div class="spinner"></div>
    </div>
    <script>
        // Redirect to dashboard with token as URL parameter
        const token = '%s';
        if (token) {
            // Dashboard will receive token, store it persistently, and use for all requests
            window.location.replace('https://new.nora-nak.de/dashboard?token=' + token);
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
<html>
<head>
    <title>Ungültiger Code - NORA</title>
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
    <h1>Ungültiger Verifizierungs-Code</h1>
    <p>Dieser Verifizierungs-Link ist ungültig oder wurde bereits verwendet.</p>
    <div class="info-box">
        <p><strong>Was können Sie tun?</strong></p>
        <p>Wenn Sie sich bereits verifiziert haben, können Sie sich jetzt anmelden. Andernfalls fordern Sie bitte eine neue Verifizierungs-E-Mail an.</p>
    </div>
    <a href="https://new.nora-nak.de">Zurück zur Startseite</a>
</body>
</html>
`
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

func getExpiredResetPage() string {
	return `
<!DOCTYPE html>
<html>
<head>
    <title>Reset-Link abgelaufen - NORA</title>
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
    <h1>Passwort-Reset-Link abgelaufen</h1>
    <p>Dieser Passwort-Reset-Link ist leider abgelaufen. Reset-Links sind aus Sicherheitsgründen nur 1 Stunde gültig.</p>
    <div class="info-box">
        <p><strong>Was können Sie tun?</strong></p>
        <p>Bitte fordern Sie einen neuen Passwort-Reset-Link an. Der neue Link wird Ihnen per E-Mail zugesendet.</p>
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
