package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nora-nak/backend/utils"
	"time"
)

// VersionResponse represents the version information
type VersionResponse struct {
	AppVersion    string `json:"app_version"`
	MinAppVersion string `json:"min_app_version"`
	APIVersion    string `json:"api_version"`
	ReleaseNotes  string `json:"release_notes"`
}

// GetVersion returns current version information
// GET /v1/version
func GetVersion(c *fiber.Ctx) error {
	return c.JSON(VersionResponse{
		AppVersion:    utils.AppVersion,
		MinAppVersion: utils.MinAppVersion,
		APIVersion:    utils.APIVersion,
		ReleaseNotes:  utils.ReleaseNotes,
	})
}

// CapgoManifestResponse represents the Capacitor updater manifest
type CapgoManifestResponse struct {
	Version       string `json:"version"`
	URL           string `json:"url"`
	ReleaseNotes  string `json:"releaseNotes"`
	MinAppVersion string `json:"minAppVersion"`
	Timestamp     string `json:"timestamp"`
}

// GetUpdateManifest returns the Capacitor updater manifest
// GET /v1/updates/manifest.json
func GetUpdateManifest(c *fiber.Ctx) error {
	baseURL := "https://api.new.nora-nak.de"

	return c.JSON(CapgoManifestResponse{
		Version:       utils.AppVersion,
		URL:           baseURL + "/v1/updates/bundles/" + utils.AppVersion + ".zip",
		ReleaseNotes:  utils.ReleaseNotes,
		MinAppVersion: utils.MinAppVersion,
		Timestamp:     time.Now().Format(time.RFC3339),
	})
}
