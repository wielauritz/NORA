package config

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/nora-nak/backend/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDatabase initializes the database connection with connection pooling
func InitDatabase() error {
	// Build DSN from environment variables
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "postgres")
	password := getEnv("DB_PASSWORD", "")
	dbname := getEnv("DB_NAME", "nora")
	sslmode := getEnv("DB_SSLMODE", "disable")

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=Europe/Berlin",
		host, port, user, password, dbname, sslmode)

	// Configure GORM logger
	gormLogger := logger.Default.LogMode(logger.Info)
	if getEnv("ENV", "development") == "production" {
		gormLogger = logger.Default.LogMode(logger.Error)
	}

	// Connect to database
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormLogger,
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
		PrepareStmt: true, // Prepared statement cache for better performance
	})

	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get underlying SQL database
	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	// Connection pool settings for optimal performance
	sqlDB.SetMaxIdleConns(10)                  // Max idle connections
	sqlDB.SetMaxOpenConns(100)                 // Max open connections
	sqlDB.SetConnMaxLifetime(time.Hour)        // Max connection lifetime
	sqlDB.SetConnMaxIdleTime(10 * time.Minute) // Max idle time

	log.Println("Database connection established successfully")
	return nil
}

// AutoMigrate runs all database migrations
func AutoMigrate() error {
	log.Println("Running database migrations...")

	err := DB.AutoMigrate(
		&models.Zenturie{},
		&models.User{},
		&models.Session{},
		&models.Course{},
		&models.Room{},
		&models.Timetable{},
		&models.CustomHour{},
		&models.Exam{},
		&models.Friend{},
	)

	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	// Add unique constraint for friends table
	DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS unique_friendship ON friends(LEAST(user_id1, user_id2), GREATEST(user_id1, user_id2))")

	// Migration: Drop old UID unique index and create composite index
	// This allows Wahlpflichtmodule (same UID) for different zenturien
	log.Println("Migrating timetable indexes for Wahlpflichtmodule support...")
	DB.Exec("DROP INDEX IF EXISTS idx_timetables_uid")
	DB.Exec("DROP INDEX IF EXISTS timetables_uid_key")
	DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_uid_zenturie ON timetables(uid, zenturien_id)")

	log.Println("Database migrations completed successfully")
	return nil
}

// CloseDatabase closes the database connection
func CloseDatabase() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// getEnv retrieves environment variable or returns default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
