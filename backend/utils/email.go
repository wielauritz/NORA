package utils

import (
	"bytes"
	"fmt"
	"html/template"

	"github.com/nora-nak/backend/config"
	"gopkg.in/gomail.v2"
)

// EmailService handles email sending
type EmailService struct{}

// NewEmailService creates a new email service
func NewEmailService() *EmailService {
	return &EmailService{}
}

// SendVerificationEmail sends an email verification link
func (e *EmailService) SendVerificationEmail(toEmail, firstName, verifyUUID string) error {
	fmt.Printf("[EMAIL] Attempting to send verification email to: %s\n", toEmail)
	subject := "NORA - E-Mail Bestätigung"
	// Link should go to backend API endpoint which handles verification and redirects to frontend
	apiURL := "https://api.new.nora-nak.de"
	verifyLink := fmt.Sprintf("%s/v1/verify?uuid=%s", apiURL, verifyUUID)
	fmt.Printf("[EMAIL] Verification link: %s\n", verifyLink)

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>E-Mail Bestätigung</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">NORA</h1>
        <p style="color: white; margin: 5px 0 0 0;">NORDAKADEMIE Organizer & Room Assistant</p>
    </div>

    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #667eea;">Hallo %s!</h2>

        <p>Willkommen bei NORA! Bitte bestätige deine E-Mail-Adresse, um deinen Account zu aktivieren.</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="%s" style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                E-Mail bestätigen
            </a>
        </div>

        <p style="color: #666; font-size: 14px;">
            Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
            <a href="%s" style="color: #667eea; word-break: break-all;">%s</a>
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; text-align: center;">
            Diese E-Mail wurde automatisch generiert. Bitte antworte nicht auf diese Nachricht.
        </p>
    </div>
</body>
</html>
`, firstName, verifyLink, verifyLink, verifyLink)

	return e.sendEmail(toEmail, subject, htmlBody)
}

// SendPasswordResetEmail sends a password reset link
func (e *EmailService) SendPasswordResetEmail(toEmail, firstName, resetUUID string) error {
	subject := "NORA - Passwort zurücksetzen"
	// Link should go to backend API endpoint which shows reset form
	apiURL := "https://api.new.nora-nak.de"
	resetLink := fmt.Sprintf("%s/v1/reset-password?uuid=%s", apiURL, resetUUID)

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Passwort zurücksetzen</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">NORA</h1>
        <p style="color: white; margin: 5px 0 0 0;">NORDAKADEMIE Organizer & Room Assistant</p>
    </div>

    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #667eea;">Hallo %s!</h2>

        <p>Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="%s" style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Passwort zurücksetzen
            </a>
        </div>

        <p style="color: #666; font-size: 14px;">
            Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
            <a href="%s" style="color: #667eea; word-break: break-all;">%s</a>
        </p>

        <p style="color: #ff6b6b; font-size: 14px; background: #ffe5e5; padding: 15px; border-radius: 5px;">
            <strong>⚠️ Achtung:</strong> Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail. Dein Passwort bleibt dann unverändert.
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; text-align: center;">
            Diese E-Mail wurde automatisch generiert. Bitte antworte nicht auf diese Nachricht.
        </p>
    </div>
</body>
</html>
`, firstName, resetLink, resetLink, resetLink)

	return e.sendEmail(toEmail, subject, htmlBody)
}

// sendEmail sends an email via SMTP
func (e *EmailService) sendEmail(to, subject, htmlBody string) error {
	fmt.Printf("[EMAIL] Preparing to send email to: %s\n", to)
	fmt.Printf("[EMAIL] Subject: %s\n", subject)
	fmt.Printf("[EMAIL] SMTP Config: Host=%s, Port=%s, User=%s, From=%s\n",
		config.AppConfig.SMTPHost,
		config.AppConfig.SMTPPort,
		config.AppConfig.SMTPUser,
		config.AppConfig.SMTPFrom)

	m := gomail.NewMessage()
	m.SetHeader("From", config.AppConfig.SMTPFrom)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", htmlBody)

	// Parse SMTP port from config
	var smtpPort int
	fmt.Sscanf(config.AppConfig.SMTPPort, "%d", &smtpPort)
	if smtpPort == 0 {
		smtpPort = 587 // Default to STARTTLS port
	}

	fmt.Printf("[EMAIL] Using port: %d, SSL: %v\n", smtpPort, smtpPort == 465)

	d := gomail.NewDialer(
		config.AppConfig.SMTPHost,
		smtpPort,
		config.AppConfig.SMTPUser,
		config.AppConfig.SMTPPassword,
	)

	// Use SSL for port 465, STARTTLS for 587
	if smtpPort == 465 {
		d.SSL = true
	}

	fmt.Printf("[EMAIL] Attempting to dial and send...\n")
	if err := d.DialAndSend(m); err != nil {
		fmt.Printf("[EMAIL ERROR] Failed to send email: %v\n", err)
		return fmt.Errorf("failed to send email: %w", err)
	}

	fmt.Printf("[EMAIL SUCCESS] Email sent successfully to: %s\n", to)
	return nil
}

// ExtractInitials extracts initials from first and last name
func ExtractInitials(firstName, lastName string) string {
	if len(firstName) == 0 || len(lastName) == 0 {
		return ""
	}
	return string(firstName[0]) + string(lastName[0])
}

// ParseEmailName extracts first and last name from email format "firstname.lastname@domain.com"
func ParseEmailName(email string) (string, string) {
	// Extract name part before @
	atIndex := 0
	for i, c := range email {
		if c == '@' {
			atIndex = i
			break
		}
	}
	if atIndex == 0 {
		return "", ""
	}

	namePart := email[:atIndex]

	// Split by dot
	dotIndex := 0
	for i, c := range namePart {
		if c == '.' {
			dotIndex = i
			break
		}
	}

	if dotIndex == 0 {
		return namePart, namePart
	}

	firstName := namePart[:dotIndex]
	lastName := namePart[dotIndex+1:]

	// Capitalize first letter
	if len(firstName) > 0 {
		firstName = string(firstName[0]-32) + firstName[1:] // Simple uppercase
	}
	if len(lastName) > 0 {
		lastName = string(lastName[0]-32) + lastName[1:] // Simple uppercase
	}

	return firstName, lastName
}

// RenderTemplate renders an HTML template with data
func RenderTemplate(tmpl string, data interface{}) (string, error) {
	t, err := template.New("email").Parse(tmpl)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}
