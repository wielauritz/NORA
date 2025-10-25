package middleware

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

// RateLimiterConfig holds configuration for rate limiting
type RateLimiterConfig struct {
	Max        int                     // Maximum number of requests
	Expiration time.Duration           // Time window for the limit
	KeyFunc    func(*fiber.Ctx) string // Function to generate the key (IP or UserID)
	Message    string                  // Error message when limit is exceeded
}

// NewRateLimiter creates a new rate limiter middleware with custom configuration
func NewRateLimiter(config RateLimiterConfig) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:          config.Max,
		Expiration:   config.Expiration,
		KeyGenerator: config.KeyFunc,
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"detail": config.Message,
			})
		},
		Storage: limiter.ConfigDefault.Storage, // Uses in-memory storage by default
	})
}

// IPBasedKeyFunc generates a key based on the client's IP address
func IPBasedKeyFunc(c *fiber.Ctx) string {
	// Get real IP from X-Forwarded-For header if behind proxy, otherwise use c.IP()
	ip := c.Get("X-Forwarded-For")
	if ip == "" {
		ip = c.IP()
	}
	return ip
}

// UserBasedKeyFunc generates a key based on the authenticated user's ID
// This requires that the user is already authenticated (AuthMiddleware must run first)
func UserBasedKeyFunc(c *fiber.Ctx) string {
	user := GetCurrentUser(c)
	if user == nil {
		// Fallback to IP if user is not authenticated (shouldn't happen if AuthMiddleware is used)
		return IPBasedKeyFunc(c)
	}
	return "user:" + fmt.Sprint(user.ID)
}

// Predefined Rate Limiters for specific endpoints

// LoginRateLimiter limits login attempts to prevent brute-force attacks
// Limit: 5 requests per 15 minutes per IP
func LoginRateLimiter() fiber.Handler {
	return NewRateLimiter(RateLimiterConfig{
		Max:        5,
		Expiration: 15 * time.Minute,
		KeyFunc:    IPBasedKeyFunc,
		Message:    "Zu viele Login-Versuche. Bitte versuchen Sie es in 15 Minuten erneut.",
	})
}

// PasswordResetRateLimiter limits password reset requests to prevent email bombing
// Limit: 5 requests per hour per IP
func PasswordResetRateLimiter() fiber.Handler {
	return NewRateLimiter(RateLimiterConfig{
		Max:        5,
		Expiration: 1 * time.Hour,
		KeyFunc:    IPBasedKeyFunc,
		Message:    "Zu viele Passwort-Reset-Anfragen. Bitte versuchen Sie es in einer Stunde erneut.",
	})
}

// ResendEmailRateLimiter limits verification email resends to prevent email spam
// Limit: 5 requests per hour per IP
func ResendEmailRateLimiter() fiber.Handler {
	return NewRateLimiter(RateLimiterConfig{
		Max:        5,
		Expiration: 1 * time.Hour,
		KeyFunc:    IPBasedKeyFunc,
		Message:    "Zu viele E-Mail-Anfragen. Bitte versuchen Sie es in einer Stunde erneut.",
	})
}

// FriendRequestRateLimiter limits friend requests to prevent spam
// Limit: 50 requests per day per user
func FriendRequestRateLimiter() fiber.Handler {
	return NewRateLimiter(RateLimiterConfig{
		Max:        50,
		Expiration: 24 * time.Hour,
		KeyFunc:    UserBasedKeyFunc,
		Message:    "Zu viele Freundschaftsanfragen. Sie können maximal 50 Anfragen pro Tag senden.",
	})
}

// SearchRateLimiter limits search requests to prevent CPU exhaustion
// Limit: 300 requests per minute per user (5 per second)
func SearchRateLimiter() fiber.Handler {
	return NewRateLimiter(RateLimiterConfig{
		Max:        300,
		Expiration: 1 * time.Minute,
		KeyFunc:    UserBasedKeyFunc,
		Message:    "Zu viele Suchanfragen. Bitte verlangsamen Sie Ihre Suche.",
	})
}
