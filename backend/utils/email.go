package utils

import (
	"bytes"
	"fmt"
	"html/template"
	"log"
	"time"

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
	log.Printf("[EMAIL] Sending verification email")
	subject := "NORA - E-Mail Bestätigung"
	// Link should go to backend API endpoint which handles verification and redirects to frontend
	apiURL := "https://api.new.nora-nak.de"
	verifyLink := fmt.Sprintf("%s/v1/verify?uuid=%s", apiURL, verifyUUID)

	// Base64 encoded logo
	logoBase64 := "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"
	htmlBody := fmt.Sprintf(`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>E-Mail Bestätigung</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9fafb;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%%">
            <tr>
                <td style="padding: 40px 20px;">
                    <!-- Logo auf grauem Hintergrund -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                        <tr>
                            <td align="center" style="padding-bottom: 30px;">
                                <img src="data:image/png;base64,%s" alt="NORA" width="200" style="display: block; max-width: 200px; height: auto;" />
                            </td>
                        </tr>
                    </table>

                    <!-- Weiße Content Box -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <tr>
                            <td style="padding: 50px 40px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%%">
                                    <tr>
                                        <td style="color: #003a79; font-size: 28px; font-weight: bold; padding-bottom: 20px;">
                                            Hallo %s!
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 20px 0; font-size: 16px; line-height: 1.8; color: #333333;">
                                            Willkommen bei NORA! Bitte bestätige deine E-Mail-Adresse, um deinen Account zu aktivieren.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding: 35px 0;">
                                            <table border="0" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td align="center" bgcolor="#3cd2ff" style="border-radius: 6px;">
                                                        <a href="%s" target="_blank" style="font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 16px 45px; display: inline-block;">E-Mail bestätigen</a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 20px 0; font-size: 14px; line-height: 1.6; color: #666666; border-top: 1px solid #e5e7eb;">
                                            <p style="margin: 10px 0 5px 0; font-weight: 600; color: #333333;">Falls der Button nicht funktioniert:</p>
                                            <p style="margin: 5px 0;">Kopiere diesen Link in deinen Browser:</p>
                                            <a href="%s" style="color: #3cd2ff; word-break: break-all;">%s</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <!-- Footer auf grauem Hintergrund -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                        <tr>
                            <td style="padding-top: 30px; text-align: center;">
                                <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #999999;">
                                    Diese E-Mail wurde automatisch generiert.<br/>
                                    Bitte antworte nicht auf diese Nachricht.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>`, logoBase64, firstName, verifyLink, verifyLink, verifyLink)

	return e.sendEmail(toEmail, subject, htmlBody)
}

// SendPasswordResetEmail sends a password reset link
func (e *EmailService) SendPasswordResetEmail(toEmail, firstName, resetUUID string) error {
	subject := "NORA - Passwort zurücksetzen"
	// Link should go to backend API endpoint which shows reset form
	apiURL := "https://api.new.nora-nak.de"
	resetLink := fmt.Sprintf("%s/v1/reset-password?uuid=%s", apiURL, resetUUID)

	// Base64 encoded logo
	logoBase64 := "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"
	htmlBody := fmt.Sprintf(`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Passwort zurücksetzen</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9fafb;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%%">
            <tr>
                <td style="padding: 40px 20px;">
                    <!-- Logo auf grauem Hintergrund -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                        <tr>
                            <td align="center" style="padding-bottom: 30px;">
                                <img src="data:image/png;base64,%s" alt="NORA" width="200" style="display: block; max-width: 200px; height: auto;" />
                            </td>
                        </tr>
                    </table>

                    <!-- Weiße Content Box -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <tr>
                            <td style="padding: 50px 40px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%%">
                                    <tr>
                                        <td style="color: #003a79; font-size: 28px; font-weight: bold; padding-bottom: 20px;">
                                            Hallo %s!
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 20px 0; font-size: 16px; line-height: 1.8; color: #333333;">
                                            Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding: 35px 0;">
                                            <table border="0" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td align="center" bgcolor="#3cd2ff" style="border-radius: 6px;">
                                                        <a href="%s" target="_blank" style="font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 16px 45px; display: inline-block;">Passwort zurücksetzen</a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 20px 0; font-size: 14px; line-height: 1.6; color: #666666; border-top: 1px solid #e5e7eb;">
                                            <p style="margin: 10px 0 5px 0; font-weight: 600; color: #333333;">Falls der Button nicht funktioniert:</p>
                                            <p style="margin: 5px 0;">Kopiere diesen Link in deinen Browser:</p>
                                            <a href="%s" style="color: #3cd2ff; word-break: break-all;">%s</a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 25px 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin-top: 20px;">
                                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #856404;">
                                                <strong>⚠️ Achtung:</strong> Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail. Dein Passwort bleibt dann unverändert.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <!-- Footer auf grauem Hintergrund -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                        <tr>
                            <td style="padding-top: 30px; text-align: center;">
                                <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #999999;">
                                    Diese E-Mail wurde automatisch generiert.<br/>
                                    Bitte antworte nicht auf diese Nachricht.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>`, logoBase64, firstName, resetLink, resetLink, resetLink)

	return e.sendEmail(toEmail, subject, htmlBody)
}

// SendICSImportNotification sends a notification about ICS import to the team
func (e *EmailService) SendICSImportNotification(filesDownloaded, eventsCreated, eventsUpdated, errors int) error {
	subject := "NORA - ICS Import Benachrichtigung"

	// Determine status
	status := "Erfolgreich"
	statusColor := "#22c55e" // green
	if errors > 0 {
		status = "Mit Fehlern abgeschlossen"
		statusColor = "#f59e0b" // orange
	}
	if filesDownloaded == 0 {
		status = "Fehlgeschlagen"
		statusColor = "#ef4444" // red
	}

	errorColor := "#22c55e"
	if errors > 0 {
		errorColor = "#ef4444"
	}

	// Base64 encoded logo
	logoBase64 := "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"
	htmlBody := fmt.Sprintf(`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>ICS Import Benachrichtigung</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9fafb;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%%">
            <tr>
                <td style="padding: 40px 20px;">
                    <!-- Logo auf grauem Hintergrund -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                        <tr>
                            <td align="center" style="padding-bottom: 30px;">
                                <img src="data:image/png;base64,%s" alt="NORA" width="200" style="display: block; max-width: 200px; height: auto;" />
                            </td>
                        </tr>
                    </table>

                    <!-- Weiße Content Box -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <tr>
                            <td style="padding: 50px 40px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%%">
                                    <tr>
                                        <td style="color: #003a79; font-size: 28px; font-weight: bold; padding-bottom: 20px;">
                                            ICS-Dateien wurden abgerufen
                                        </td>
                                    </tr>

                                    <!-- Status Badge -->
                                    <tr>
                                        <td align="center" style="padding: 25px 0;">
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%%">
                                                <tr>
                                                    <td align="center" bgcolor="%s" style="padding: 16px; border-radius: 6px;">
                                                        <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: bold;">Status: %s</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>

                                    <!-- Statistics Table -->
                                    <tr>
                                        <td style="padding: 25px 0;">
                                            <table border="0" cellpadding="12" cellspacing="0" width="100%%" style="border-collapse: collapse; border: 1px solid #e5e7eb;">
                                                <tr bgcolor="#f3f4f6">
                                                    <td style="border: 1px solid #e5e7eb; font-weight: bold; color: #333333;">Heruntergeladene Dateien</td>
                                                    <td align="right" style="border: 1px solid #e5e7eb; color: #333333;">%d</td>
                                                </tr>
                                                <tr bgcolor="#ffffff">
                                                    <td style="border: 1px solid #e5e7eb; font-weight: bold; color: #333333;">Neu hinzugefügte Events</td>
                                                    <td align="right" style="border: 1px solid #e5e7eb; color: #22c55e; font-weight: bold;">%d</td>
                                                </tr>
                                                <tr bgcolor="#f3f4f6">
                                                    <td style="border: 1px solid #e5e7eb; font-weight: bold; color: #333333;">Aktualisierte Events</td>
                                                    <td align="right" style="border: 1px solid #e5e7eb; color: #3cd2ff; font-weight: bold;">%d</td>
                                                </tr>
                                                <tr bgcolor="#ffffff">
                                                    <td style="border: 1px solid #e5e7eb; font-weight: bold; color: #333333;">Fehler</td>
                                                    <td align="right" style="border: 1px solid #e5e7eb; color: %s; font-weight: bold;">%d</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td style="padding: 20px 0; font-size: 14px; color: #666666; border-top: 1px solid #e5e7eb;">
                                            <strong>Zeitpunkt:</strong> %s
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <!-- Footer auf grauem Hintergrund -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                        <tr>
                            <td style="padding-top: 30px; text-align: center;">
                                <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #999999;">
                                    Diese E-Mail wurde automatisch vom NORA-System generiert.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>`,
		logoBase64,
		statusColor,
		status,
		filesDownloaded,
		eventsCreated,
		eventsUpdated,
		errorColor,
		errors,
		time.Now().Format("02.01.2006 15:04:05"),
	)

	return e.sendEmail(config.AppConfig.TeamEmail, subject, htmlBody)
}

// sendEmail sends an email via SMTP
func (e *EmailService) sendEmail(to, subject, htmlBody string) error {
	log.Printf("[EMAIL] Preparing to send email")
	log.Printf("[EMAIL] Subject: %s", subject)
	log.Printf("[EMAIL] SMTP Config: Host=%s, Port=%s",
		config.AppConfig.SMTPHost,
		config.AppConfig.SMTPPort)

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

	log.Printf("[EMAIL] Using port: %d, SSL: %v", smtpPort, smtpPort == 465)

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

	log.Printf("[EMAIL] Attempting to dial and send")
	if err := d.DialAndSend(m); err != nil {
		log.Printf("[EMAIL ERROR] Failed to send email: %v", err)
		return fmt.Errorf("failed to send email: %w", err)
	}

	log.Printf("[EMAIL SUCCESS] Email sent successfully")
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
