package utils

import (
	"crypto/sha256"
	"encoding/hex"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword hashes a plain text password using SHA256 then bcrypt (compatible with Python version)
func HashPassword(password string) (string, error) {
	// First hash with SHA256 (like Python version)
	sha := sha256.New()
	sha.Write([]byte(password))
	shaHash := hex.EncodeToString(sha.Sum(nil))

	// Then hash with bcrypt
	bytes, err := bcrypt.GenerateFromPassword([]byte(shaHash), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPasswordHash compares a hashed password with a plain text password (compatible with Python version)
func CheckPasswordHash(password, hash string) bool {
	// First hash with SHA256
	sha := sha256.New()
	sha.Write([]byte(password))
	shaHash := hex.EncodeToString(sha.Sum(nil))

	// Then compare with bcrypt
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(shaHash))
	return err == nil
}
