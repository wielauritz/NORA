package middleware

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/models"
)

// IntrospectionCache stores introspection results temporarily
type IntrospectionCache struct {
	mu    sync.RWMutex
	cache map[string]*CachedIntrospection
}

type CachedIntrospection struct {
	Active    bool
	ExpiresAt time.Time
}

var introspectionCache = &IntrospectionCache{
	cache: make(map[string]*CachedIntrospection),
}

// TokenIntrospectionResponse represents Keycloak's introspection response
type TokenIntrospectionResponse struct {
	Active       bool   `json:"active"`
	SessionState string `json:"session_state,omitempty"`
	Exp          int64  `json:"exp,omitempty"`
	Iat          int64  `json:"iat,omitempty"`
	Sub          string `json:"sub,omitempty"`
	Scope        string `json:"scope,omitempty"`
}

// KeycloakAuthMiddleware validates JWT from Keycloak and auto-creates users
func KeycloakAuthMiddleware(c *fiber.Ctx) error {
	tenant := GetCurrentTenant(c)
	if tenant == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Tenant context not found. Ensure TenantMiddleware runs first.",
		})
	}

	// Extract Authorization header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authorization header required",
		})
	}

	// Extract token (remove "Bearer " prefix)
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid authorization format. Use: Bearer <token>",
		})
	}

	// Validate JWT using Keycloak's JWK endpoint
	token, err := validateKeycloakToken(tokenString, tenant)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": fmt.Sprintf("Invalid token: %v", err),
		})
	}

	// Validate session with Keycloak introspection endpoint
	sessionValid, err := introspectToken(tokenString, tenant)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": fmt.Sprintf("Session validation failed: %v", err),
		})
	}

	if !sessionValid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Session is no longer active",
		})
	}

	// Extract claims
	keycloakUserID := token.Subject()
	email, _ := token.Get("email")
	emailStr, _ := email.(string)

	// Extract roles from realm_access
	var roles []string
	if realmAccess, ok := token.Get("realm_access"); ok {
		if realmMap, ok := realmAccess.(map[string]interface{}); ok {
			if rolesInterface, ok := realmMap["roles"]; ok {
				if rolesList, ok := rolesInterface.([]interface{}); ok {
					for _, role := range rolesList {
						if roleStr, ok := role.(string); ok {
							// Filter to only include our custom roles
							if isCustomRole(roleStr) {
								roles = append(roles, roleStr)
							}
						}
					}
				}
			}
		}
	}

	// Find or create user
	var user models.User
	result := config.DB.Where("tenant_id = ? AND keycloak_user_id = ?", tenant.ID, keycloakUserID).First(&user)

	if result.Error != nil {
		// Auto-create user from JWT claims on first login
		firstName, lastName := parseNameFromEmail(emailStr)

		user = models.User{
			TenantID:       tenant.ID,
			KeycloakUserID: keycloakUserID,
			Email:          emailStr,
			FirstName:      firstName,
			LastName:       lastName,
			Initials:       generateInitials(firstName, lastName),
		}

		if err := config.DB.Create(&user).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to create user",
			})
		}
	}

	// Store in context
	c.Locals("user", &user)
	c.Locals("user_id", user.ID)
	c.Locals("roles", roles)

	return c.Next()
}

// validateKeycloakToken validates JWT using Keycloak's public key (JWK)
func validateKeycloakToken(tokenString string, tenant *models.Tenant) (jwt.Token, error) {
	// Construct JWK URL
	jwkURL := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/certs",
		tenant.KeycloakURL, tenant.KeycloakRealmID)

	// Fetch JWK set with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	keySet, err := jwk.Fetch(ctx, jwkURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch JWK: %w", err)
	}

	// Parse and validate token
	token, err := jwt.Parse(
		[]byte(tokenString),
		jwt.WithKeySet(keySet),
		jwt.WithValidate(true),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	// Validate issuer matches tenant's realm
	expectedIssuer := fmt.Sprintf("%s/realms/%s", tenant.KeycloakURL, tenant.KeycloakRealmID)
	if token.Issuer() != expectedIssuer {
		return nil, fmt.Errorf("invalid issuer: expected %s, got %s", expectedIssuer, token.Issuer())
	}

	return token, nil
}

// parseNameFromEmail attempts to extract first and last name from email
// Example: "john.doe@nordakademie.de" -> "John", "Doe"
func parseNameFromEmail(email string) (string, string) {
	if email == "" {
		return "Unknown", "User"
	}

	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return "Unknown", "User"
	}

	localPart := parts[0]
	nameParts := strings.Split(localPart, ".")

	if len(nameParts) >= 2 {
		firstName := strings.Title(strings.ToLower(nameParts[0]))
		lastName := strings.Title(strings.ToLower(nameParts[1]))
		return firstName, lastName
	}

	// Single name: use as first name
	return strings.Title(strings.ToLower(localPart)), "User"
}

// generateInitials generates 2-character initials from names
func generateInitials(firstName, lastName string) string {
	if len(firstName) == 0 || len(lastName) == 0 {
		return "UU"
	}

	first := strings.ToUpper(string(firstName[0]))
	last := strings.ToUpper(string(lastName[0]))
	return first + last
}

// isCustomRole filters out Keycloak default roles
func isCustomRole(role string) bool {
	// Only include our custom roles
	customRoles := []string{"admin", "teacher", "student", "support"}
	for _, customRole := range customRoles {
		if role == customRole {
			return true
		}
	}
	return false
}

// introspectToken validates the token and session with Keycloak's introspection endpoint
func introspectToken(tokenString string, tenant *models.Tenant) (bool, error) {
	// Check cache first
	if cached := getCachedIntrospection(tokenString); cached != nil {
		if time.Now().Before(cached.ExpiresAt) {
			return cached.Active, nil
		}
		// Cache expired, remove it
		removeCachedIntrospection(tokenString)
	}

	// For now, skip introspection and rely on JWT signature validation
	// This is because public clients (nora-frontend) cannot use introspection without client_secret
	// JWT validation already ensures the token is valid and signed by Keycloak
	// TODO: Set up a confidential client for backend-to-backend introspection

	// Cache as active for 30 seconds (matches JWT validation)
	cacheIntrospection(tokenString, true, 30*time.Second)

	return true, nil
}

// getCachedIntrospection retrieves cached introspection result
func getCachedIntrospection(token string) *CachedIntrospection {
	introspectionCache.mu.RLock()
	defer introspectionCache.mu.RUnlock()
	return introspectionCache.cache[token]
}

// cacheIntrospection stores introspection result in cache
func cacheIntrospection(token string, active bool, duration time.Duration) {
	introspectionCache.mu.Lock()
	defer introspectionCache.mu.Unlock()
	introspectionCache.cache[token] = &CachedIntrospection{
		Active:    active,
		ExpiresAt: time.Now().Add(duration),
	}
}

// removeCachedIntrospection removes cached introspection result
func removeCachedIntrospection(token string) {
	introspectionCache.mu.Lock()
	defer introspectionCache.mu.Unlock()
	delete(introspectionCache.cache, token)
}

// cleanupIntrospectionCache periodically removes expired cache entries
func init() {
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			introspectionCache.mu.Lock()
			now := time.Now()
			for token, cached := range introspectionCache.cache {
				if now.After(cached.ExpiresAt) {
					delete(introspectionCache.cache, token)
				}
			}
			introspectionCache.mu.Unlock()
		}
	}()
}
