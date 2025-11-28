package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/models"
)

func main() {
	// Load .env file from the parent directory
	if err := godotenv.Load("../.env"); err != nil {
		log.Fatal("Error loading .env file")
	}

	// Initialize database
	if err := config.InitDatabase(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer config.CloseDatabase()

	if len(os.Args) < 3 {
		log.Fatal("Usage: go run add_zenturie.go <name> <year>")
	}

	name := os.Args[1]
	year := os.Args[2]

	zenturie := models.Zenturie{
		Name: name,
		Year: year,
	}

	if err := config.DB.Create(&zenturie).Error; err != nil {
		log.Fatalf("Failed to create zenturie '%s': %v", name, err)
	}

	fmt.Printf("Successfully created zenturie: %s (%s)\n", name, year)
}
