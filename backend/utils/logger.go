package utils

import (
	"fmt"
	"log"
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

// LogLevel represents logging levels
type LogLevel int

const (
	LogLevelDebug LogLevel = iota
	LogLevelInfo
	LogLevelWarning
	LogLevelError
)

// getLogLevel converts string to LogLevel
func getLogLevel(level string) LogLevel {
	switch level {
	case "debug":
		return LogLevelDebug
	case "info":
		return LogLevelInfo
	case "warning", "warn":
		return LogLevelWarning
	case "error":
		return LogLevelError
	default:
		return LogLevelInfo
	}
}

// shouldLog checks if the message should be logged based on configured log level
// Note: This requires config package, but to avoid circular imports,
// we check environment variable directly
func shouldLog(level LogLevel) bool {
	logLevelStr := os.Getenv("LOG_LEVEL")
	if logLevelStr == "" {
		logLevelStr = "info"
	}
	configuredLevel := getLogLevel(logLevelStr)
	return level >= configuredLevel
}

// LogDebug logs debug messages (only in debug mode)
// Use for detailed troubleshooting information
// WICHTIG: Keine personenbezogenen Daten loggen!
func LogDebug(format string, v ...interface{}) {
	if shouldLog(LogLevelDebug) {
		log.Printf("[DEBUG] "+format, v...)
	}
}

// LogInfo logs informational messages
// Use for general operational messages
// WICHTIG: Keine personenbezogenen Daten loggen!
func LogInfo(format string, v ...interface{}) {
	if shouldLog(LogLevelInfo) {
		log.Printf("[INFO] "+format, v...)
	}
}

// LogWarning logs warning messages
// Use for unexpected but non-critical issues
func LogWarning(format string, v ...interface{}) {
	if shouldLog(LogLevelWarning) {
		log.Printf("[WARNING] "+format, v...)
	}
}

// LogError logs error messages
// Use for errors that need attention
func LogError(format string, v ...interface{}) {
	if shouldLog(LogLevelError) {
		log.Printf("[ERROR] "+format, v...)
	}
}
