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
		&models.FriendRequest{},
		&models.UserSettings{},
	)

	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	// Add unique constraint for friends table (v1)
	DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS unique_friendship ON friends(LEAST(user_id1, user_id2), GREATEST(user_id1, user_id2))")

	// Add unique constraint for friend_requests table (v2) - prevent duplicate requests
	DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS unique_friend_request ON friend_requests(LEAST(requester_id, receiver_id), GREATEST(requester_id, receiver_id)) WHERE status IN ('pending', 'accepted')")

	// Migration: Drop old UID unique index and create composite index
	// This allows Wahlpflichtmodule (same UID) for different zenturien
	log.Println("Migrating timetable indexes for Wahlpflichtmodule support...")
	DB.Exec("DROP INDEX IF EXISTS idx_timetables_uid")
	DB.Exec("DROP INDEX IF EXISTS timetables_uid_key")
	DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_uid_zenturie ON timetables(uid, zenturien_id)")

	// Migration: Fix room numbers to exactly 4 characters (Letter + 3 digits)
	// Removes trailing letters from room numbers like "A001E" -> "A001"
	if err := fixRoomNumbers(); err != nil {
		log.Printf("WARNING: Failed to fix room numbers: %v", err)
	}

	log.Println("Database migrations completed successfully")

	return nil
}

// fixRoomNumbers fixes room numbers to exactly 4 characters (Letter + 3 digits)
// Removes trailing letters from room numbers like "A001E" -> "A001"
// Handles duplicates by merging relationships to the existing room
func fixRoomNumbers() error {
	log.Println("Checking for room numbers that need fixing...")

	// Find all rooms with room_number longer than 4 characters
	var roomsToFix []models.Room
	if err := DB.Where("LENGTH(room_number) > 4").Find(&roomsToFix).Error; err != nil {
		return fmt.Errorf("failed to find rooms to fix: %w", err)
	}

	if len(roomsToFix) == 0 {
		log.Println("No room numbers need fixing")
		return nil
	}

	log.Printf("Found %d room(s) with room_number longer than 4 characters", len(roomsToFix))

	fixed := 0
	merged := 0

	for _, room := range roomsToFix {
		// Truncate to 4 characters
		newRoomNumber := room.RoomNumber
		if len(newRoomNumber) > 4 {
			newRoomNumber = newRoomNumber[:4]
		}

		log.Printf("Fixing room: %s -> %s", room.RoomNumber, newRoomNumber)

		// Check if a room with the new number already exists
		var existingRoom models.Room
		result := DB.Where("room_number = ? AND id != ?", newRoomNumber, room.ID).First(&existingRoom)

		if result.Error == nil {
			// Room with truncated number already exists - merge relationships
			log.Printf("Room %s already exists (ID: %d), merging room %s (ID: %d)",
				newRoomNumber, existingRoom.ID, room.RoomNumber, room.ID)

			// Update all timetables to reference the existing room
			DB.Model(&models.Timetable{}).Where("room_id = ?", room.ID).Update("room_id", existingRoom.ID)

			// Update all custom_hours to reference the existing room
			DB.Model(&models.CustomHour{}).Where("room_id = ?", room.ID).Update("room_id", existingRoom.ID)

			// Update all exams to reference the existing room
			DB.Model(&models.Exam{}).Where("room_id = ?", room.ID).Update("room_id", existingRoom.ID)

			// Delete the duplicate room
			if err := DB.Delete(&room).Error; err != nil {
				log.Printf("WARNING: Failed to delete duplicate room %s: %v", room.RoomNumber, err)
			} else {
				merged++
			}
		} else {
			// No existing room with truncated number - just update the room_number
			if err := DB.Model(&room).Update("room_number", newRoomNumber).Error; err != nil {
				log.Printf("WARNING: Failed to update room %s: %v", room.RoomNumber, err)
			} else {
				fixed++
			}
		}
	}

	log.Printf("Room number migration complete: %d fixed, %d merged", fixed, merged)
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
