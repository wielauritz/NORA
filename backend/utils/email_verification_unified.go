package utils

import (
	"fmt"
	"log"
)

// SendVerificationEmail sends email verification based on AUTH_MODE
// authMode can be: "LINK" (link only), "OTP" (code only), or "BOTH" (link + code fallback)
func (e *EmailService) SendVerificationEmail(toEmail, firstName, verifyUUID, verificationCode, authMode string) error {
	log.Printf("[EMAIL] Sending verification email (mode: %s)", authMode)
	subject := "NORA - E-Mail Bestätigung"

	// Generate verification link
	apiURL := "https://api.new.nora-nak.de"
	verifyLink := fmt.Sprintf("%s/v1/verify?uuid=%s", apiURL, verifyUUID)

	var htmlBody string

	// Generate email content based on AUTH_MODE
	switch authMode {
	case "LINK":
		// Link-only mode - prominent button, no code
		htmlBody = fmt.Sprintf(`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
                <!-- Logo -->
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                    <tr>
                        <td align="center" style="padding-bottom: 30px;">
                            <img src="data:image/png;base64,%s" alt="NORA" width="200" style="display: block; max-width: 200px; height: auto;" />
                        </td>
                    </tr>
                </table>

                <!-- Content Box -->
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px;" align="center">
                            <!-- Greeting -->
                            <h1 style="margin: 0 0 16px 0; color: #003a79; font-size: 26px; font-weight: bold;">
                                Hallo %s!
                            </h1>

                            <!-- Welcome Text -->
                            <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                                Willkommen bei NORA! Klicke auf den Button, um deine E-Mail-Adresse zu bestätigen und deinen Account zu aktivieren.
                            </p>

                            <!-- Button -->
                            <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
                                <tr>
                                    <td align="center" bgcolor="#3cd2ff" style="border-radius: 8px; background-color: #3cd2ff;">
                                        <a href="%s" target="_blank" style="display: inline-block; font-size: 16px; font-weight: 600; color: #ffffff !important; text-decoration: none; background-color: #3cd2ff; padding: 16px 48px; border-radius: 8px;">
                                            ✓ E-Mail jetzt bestätigen
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Info Box -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="margin: 0 0 32px 0; background-color: #f0f9ff; border-left: 4px solid #3cd2ff; border-radius: 4px; text-align: left;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #0c4a6e;">
                                            <strong>💡 Hinweis:</strong> Dieser Link ist aus Sicherheitsgründen 24 Stunden gültig.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Alternative Link Section -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="padding: 24px 0 0 0; border-top: 1px solid #e5e7eb; text-align: left;">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #333333;">
                                            Falls der Button nicht funktioniert:
                                        </p>
                                        <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #666666;">
                                            Kopiere diesen Link in deinen Browser:
                                        </p>
                                        <p style="margin: 0; font-size: 11px; word-break: break-all; color: #3cd2ff;">
                                            %s
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- Footer -->
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
</html>`, EmailLogoBase64, firstName, verifyLink, verifyLink)

	case "OTP":
		// Code-only mode - show 6-digit code prominently
		htmlBody = fmt.Sprintf(`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
                <!-- Logo -->
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                    <tr>
                        <td align="center" style="padding-bottom: 30px;">
                            <img src="data:image/png;base64,%s" alt="NORA" width="200" style="display: block; max-width: 200px; height: auto;" />
                        </td>
                    </tr>
                </table>

                <!-- Content Box -->
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px;" align="center">
                            <!-- Greeting -->
                            <h1 style="margin: 0 0 16px 0; color: #003a79; font-size: 26px; font-weight: bold;">
                                Hallo %s!
                            </h1>

                            <!-- Welcome Text -->
                            <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                                Willkommen bei NORA! Gib den folgenden Code in der App ein, um deine E-Mail-Adresse zu bestätigen.
                            </p>

                            <!-- Code Box -->
                            <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
                                <tr>
                                    <td align="center" bgcolor="#f3f4f6" style="padding: 20px 40px; background-color: #f3f4f6; border-radius: 8px; border: 2px solid #e5e7eb;">
                                        <p style="margin: 0; font-size: 36px; font-weight: bold; color: #111827; letter-spacing: 10px; font-family: 'Courier New', Courier, monospace;">
                                            %s
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Info Box -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="margin: 0; background-color: #f0f9ff; border-left: 4px solid #3cd2ff; border-radius: 4px; text-align: left;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #0c4a6e;">
                                            <strong>💡 Hinweis:</strong> Dieser Code ist aus Sicherheitsgründen 24 Stunden gültig.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- Footer -->
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
</html>`, EmailLogoBase64, firstName, verificationCode)

	default: // "BOTH"
		// Both methods - button for link, then code as alternative
		htmlBody = fmt.Sprintf(`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
                <!-- Logo -->
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
                    <tr>
                        <td align="center" style="padding-bottom: 30px;">
                            <img src="data:image/png;base64,%s" alt="NORA" width="200" style="display: block; max-width: 200px; height: auto;" />
                        </td>
                    </tr>
                </table>

                <!-- Content Box -->
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px;" align="center">
                            <!-- Greeting -->
                            <h1 style="margin: 0 0 16px 0; color: #003a79; font-size: 26px; font-weight: bold;">
                                Hallo %s!
                            </h1>

                            <!-- Welcome Text -->
                            <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                                Willkommen bei NORA! Bestätige deine E-Mail-Adresse, um deinen Account zu aktivieren.
                            </p>

                            <!-- Button -->
                            <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
                                <tr>
                                    <td align="center" bgcolor="#3cd2ff" style="border-radius: 8px; background-color: #3cd2ff;">
                                        <a href="%s" target="_blank" style="display: inline-block; font-size: 16px; font-weight: 600; color: #ffffff !important; text-decoration: none; background-color: #3cd2ff; padding: 16px 48px; border-radius: 8px;">
                                            ✓ E-Mail jetzt bestätigen
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Divider -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="margin: 0 0 24px 0;">
                                <tr>
                                    <td style="border-top: 1px solid #e5e7eb;"></td>
                                </tr>
                            </table>

                            <!-- Alternative Link Section -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="margin: 0 0 32px 0; text-align: left;">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #333333;">
                                            Falls der Button nicht funktioniert:
                                        </p>
                                        <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #666666;">
                                            Kopiere diesen Link in deinen Browser:
                                        </p>
                                        <p style="margin: 0; font-size: 11px; word-break: break-all; color: #3cd2ff;">
                                            %s
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Alternative Code Section -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="margin: 0 0 32px 0; text-align: left;">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #333333;">
                                            Alternativ:
                                        </p>
                                        <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #666666;">
                                            Falls der Link nicht funktioniert, gebe bei NORA den folgenden Code ein:
                                        </p>
                                        <p style="margin: 0; font-size: 16px; font-weight: bold; color: #111827; letter-spacing: 4px; font-family: 'Courier New', Courier, monospace;">
                                            %s
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Info Box -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="margin: 0 0 24px 0; background-color: #f0f9ff; border-left: 4px solid #3cd2ff; border-radius: 4px; text-align: left;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #0c4a6e;">
                                            <strong>💡 Hinweis:</strong> Link und Code sind aus Sicherheitsgründen 24 Stunden gültig.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- Footer -->
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
</html>`, EmailLogoBase64, firstName, verifyLink, verifyLink, verificationCode)
	}

	return e.sendEmail(toEmail, subject, htmlBody)
}
