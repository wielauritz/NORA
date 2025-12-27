package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/nora-nak/backend/middleware"
	"github.com/nora-nak/backend/models"
)

// KeycloakTokenResponse represents the response from Keycloak token endpoint
type KeycloakTokenResponse struct {
	AccessToken      string `json:"access_token"`
	ExpiresIn        int    `json:"expires_in"`
	RefreshExpiresIn int    `json:"refresh_expires_in"`
	RefreshToken     string `json:"refresh_token"`
	TokenType        string `json:"token_type"`
	IDToken          string `json:"id_token"`
	SessionState     string `json:"session_state"`
	Scope            string `json:"scope"`
}

// KeycloakCallback handles the OAuth2 callback from Keycloak
// Exchanges authorization code for tokens and redirects to dashboard with session
func KeycloakCallback(c *fiber.Ctx) error {
	// Get tenant from context
	tenant := middleware.GetCurrentTenant(c)
	if tenant == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Tenant context not found",
		})
	}

	// Get authorization code from query params
	code := c.Query("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Authorization code not provided",
		})
	}

	// For now, we'll try without PKCE since the client is public
	// Keycloak may not require PKCE for public clients
	codeVerifier := ""

	// Exchange code for tokens
	tokens, err := exchangeCodeForTokens(code, codeVerifier, tenant, c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to exchange code for tokens: %v", err),
		})
	}

	// Redirect to dashboard with tokens in URL fragment (for frontend to pick up)
	redirectURL := fmt.Sprintf("/dashboard.html#session_state=%s&access_token=%s&refresh_token=%s&expires_in=%d",
		url.QueryEscape(tokens.SessionState),
		url.QueryEscape(tokens.AccessToken),
		url.QueryEscape(tokens.RefreshToken),
		tokens.ExpiresIn,
	)

	return c.Redirect(redirectURL, fiber.StatusFound)
}

// exchangeCodeForTokens exchanges authorization code for tokens using Keycloak token endpoint
func exchangeCodeForTokens(code, codeVerifier string, tenant *models.Tenant, c *fiber.Ctx) (*KeycloakTokenResponse, error) {
	tokenURL := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/token",
		tenant.KeycloakURL, tenant.KeycloakRealmID)

	// Build redirect URI (must match the one used in authorization request)
	redirectURI := fmt.Sprintf("%s/v1/auth/callback", c.BaseURL())

	// Prepare form data
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("client_id", "nora-frontend")
	data.Set("code", code)
	data.Set("redirect_uri", redirectURI)

	// Only add code_verifier if provided (PKCE)
	if codeVerifier != "" {
		data.Set("code_verifier", codeVerifier)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create token request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	// Send request
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read token response: %w", err)
	}

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token endpoint returned status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var tokenResp KeycloakTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("failed to parse token response: %w", err)
	}

	return &tokenResp, nil
}
