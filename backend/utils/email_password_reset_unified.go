package utils

import (
	"fmt"
	"log"
)

// SendPasswordResetEmailUnified sends a password reset email that adapts to AUTH_MODE
// authMode can be "LINK", "OTP", or "BOTH"
func (e *EmailService) SendPasswordResetEmailUnified(to, firstName, resetUUID, resetCode, authMode string) error {
	baseURL := "https://new.nora-nak.de"
	resetLink := fmt.Sprintf("%s/reset-password-confirm.html?uuid=%s", baseURL, resetUUID)

	var subject string
	var htmlBody string

	switch authMode {
	case "LINK":
		subject = "Passwort zurücksetzen - NORA"
		htmlBody = fmt.Sprintf(`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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

							<!-- Info Text -->
							<p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #333333;">
								Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. Klicke auf den Button, um ein neues Passwort festzulegen.
							</p>

							<!-- Button -->
							<table border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
								<tr>
									<td align="center" bgcolor="#3cd2ff" style="border-radius: 8px; background-color: #3cd2ff;">
										<a href="%s" target="_blank" style="display: inline-block; padding: 16px 48px; color: #ffffff !important; text-decoration: none; background-color: #3cd2ff; font-size: 16px; font-weight: 600; border-radius: 8px;">
											🔒 Passwort zurücksetzen
										</a>
									</td>
								</tr>
							</table>

							<!-- Info Box -->
							<table border="0" cellpadding="0" cellspacing="0" width="100%%" style="margin: 0 0 24px 0; background-color: #f0f9ff; border-left: 4px solid #3cd2ff; border-radius: 4px; text-align: left;">
								<tr>
									<td style="padding: 16px;">
										<p style="margin: 0; font-size: 14px; line-height: 1.5; color: #0c4a6e;">
											<strong>⚠️ Wichtig:</strong> Dieser Link ist aus Sicherheitsgründen nur 1 Stunde gültig.
										</p>
									</td>
								</tr>
							</table>

							<!-- Security Note -->
							<p style="margin: 0 0 32px 0; font-size: 14px; line-height: 1.6; color: #666666;">
								Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren. Dein Passwort bleibt unverändert.
							</p>

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
</html>`, EmailLogoBase64, firstName, resetLink, resetLink)

	case "OTP":
		subject = "Dein Passwort-Rücksetzcode - NORA"
		htmlBody = fmt.Sprintf(`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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

							<!-- Info Text -->
							<p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #333333;">
								Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. Gib den folgenden Code in der App ein, um ein neues Passwort festzulegen.
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
							<table border="0" cellpadding="0" cellspacing="0" width="100%%" style="margin: 0 0 24px 0; background-color: #f0f9ff; border-left: 4px solid #3cd2ff; border-radius: 4px; text-align: left;">
								<tr>
									<td style="padding: 16px;">
										<p style="margin: 0; font-size: 14px; line-height: 1.5; color: #0c4a6e;">
											<strong>⚠️ Wichtig:</strong> Dieser Code ist aus Sicherheitsgründen nur 1 Stunde gültig.
										</p>
									</td>
								</tr>
							</table>

							<!-- Security Note -->
							<p style="margin: 0; font-size: 14px; line-height: 1.6; color: #666666;">
								Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren. Dein Passwort bleibt unverändert.
							</p>
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
</html>`, EmailLogoBase64, firstName, resetCode)

	case "BOTH":
		fallthrough
	default:
		subject = "Passwort zurücksetzen - NORA"
		htmlBody = fmt.Sprintf(`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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

							<!-- Info Text -->
							<p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #333333;">
								Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. Klicke auf den Button, um ein neues Passwort festzulegen.
							</p>

							<!-- Button -->
							<table border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
								<tr>
									<td align="center" bgcolor="#3cd2ff" style="border-radius: 8px; background-color: #3cd2ff;">
										<a href="%s" target="_blank" style="display: inline-block; padding: 16px 48px; color: #ffffff !important; text-decoration: none; background-color: #3cd2ff; font-size: 16px; font-weight: 600; border-radius: 8px;">
											🔒 Passwort zurücksetzen
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
											<strong>⚠️ Wichtig:</strong> Link und Code sind aus Sicherheitsgründen nur 1 Stunde gültig.
										</p>
									</td>
								</tr>
							</table>

							<!-- Security Note -->
							<p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #666666;">
								Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren. Dein Passwort bleibt unverändert.
							</p>
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
</html>`, EmailLogoBase64, firstName, resetLink, resetLink, resetCode)
	}

	err := e.sendEmail(to, subject, htmlBody)
	if err != nil {
		log.Printf("Failed to send password reset email to %s: %v", to, err)
		return err
	}

	log.Printf("Password reset email sent successfully to %s (mode: %s)", to, authMode)
	return nil
}
