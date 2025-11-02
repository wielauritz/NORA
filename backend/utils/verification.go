package utils

import (
	"crypto/rand"
	"fmt"
	"math/big"
)

// GenerateVerificationCode generates a random 6-digit verification code
func GenerateVerificationCode() (string, error) {
	// Generate a random number between 100000 and 999999
	max := big.NewInt(900000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", fmt.Errorf("failed to generate random number: %w", err)
	}

	// Add 100000 to ensure it's always 6 digits
	code := n.Int64() + 100000
	return fmt.Sprintf("%06d", code), nil
}
