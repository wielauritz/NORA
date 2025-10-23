package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// LogICSImportStatistics logs ICS import statistics to a file
func LogICSImportStatistics(filesDownloaded, eventsCreated, eventsUpdated, eventsUnchanged, errors int) error {
	// Define log file path
	logDir := "logs"
	logFile := filepath.Join(logDir, "ics_data_imports.log")

	// Ensure logs directory exists
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return fmt.Errorf("failed to create logs directory: %w", err)
	}

	// Open log file in append mode
	f, err := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}
	defer f.Close()

	// Calculate totals
	totalRecords := eventsCreated + eventsUpdated + eventsUnchanged

	// Format log entry
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	logEntry := fmt.Sprintf(
		"[%s] ICS-Import abgeschlossen - Dateien heruntergeladen: %d | Datensätze gesamt: %d | Neu hinzugefügt: %d | Geändert: %d | Bereits vorhanden: %d | Fehler: %d\n",
		timestamp,
		filesDownloaded,
		totalRecords,
		eventsCreated,
		eventsUpdated,
		eventsUnchanged,
		errors,
	)

	// Write to file
	if _, err := f.WriteString(logEntry); err != nil {
		return fmt.Errorf("failed to write to log file: %w", err)
	}

	return nil
}
