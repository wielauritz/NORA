package services

import (
	"log"
	"sync"
	"time"

	"github.com/nora-nak/backend/utils"
	"github.com/robfig/cron/v3"
)

var (
	scheduler *cron.Cron
	mu        sync.Mutex
	isRunning bool
)

// SchedulerStatus represents the scheduler status
type SchedulerStatus struct {
	Status  string     `json:"status"`
	Running bool       `json:"running"`
	NextRun *time.Time `json:"next_run,omitempty"`
	JobName string     `json:"job_name,omitempty"`
}

// StartScheduler starts the cron scheduler for timetable updates
func StartScheduler(runImmediately bool) error {
	mu.Lock()
	defer mu.Unlock()

	if isRunning {
		log.Println("Scheduler is already running")
		return nil
	}

	log.Println("Starting scheduler service...")

	// Create new cron scheduler
	scheduler = cron.New(cron.WithLocation(time.UTC))

	// Add job every 15 minutes (at :00, :15, :30, :45)
	_, err := scheduler.AddFunc("*/15 * * * *", func() {
		log.Println("=============================================================")
		log.Println("TIMETABLE UPDATE STARTED (Every 15 minutes)")
		log.Printf("Time (UTC): %s", time.Now().UTC().Format(time.RFC3339))
		log.Println("=============================================================")

		if err := FetchAndImportTimetables(); err != nil {
			log.Printf("ERROR during timetable update: %v", err)
			log.Println("Scheduler will retry in 15 minutes")
		} else {
			log.Println("=============================================================")
			log.Println("TIMETABLE UPDATE COMPLETED")
			log.Println("=============================================================")
		}
	})

	if err != nil {
		return err
	}

	// Start scheduler
	scheduler.Start()
	isRunning = true

	log.Println("Scheduler started - Running every 15 minutes")

	// Optionally run immediately
	if runImmediately {
		log.Println("Running first import immediately...")
		go func() {
			if err := FetchAndImportTimetables(); err != nil {
				log.Printf("ERROR during immediate import: %v", err)
			}
		}()
	}

	return nil
}

// StopScheduler stops the scheduler
func StopScheduler() {
	mu.Lock()
	defer mu.Unlock()

	if !isRunning || scheduler == nil {
		log.Println("Scheduler is not running")
		return
	}

	log.Println("Stopping scheduler service...")
	ctx := scheduler.Stop()
	<-ctx.Done()
	isRunning = false
	scheduler = nil
	log.Println("Scheduler stopped")
}

// GetSchedulerStatus returns the current scheduler status
func GetSchedulerStatus() SchedulerStatus {
	mu.Lock()
	defer mu.Unlock()

	if !isRunning || scheduler == nil {
		return SchedulerStatus{
			Status:  "stopped",
			Running: false,
			NextRun: nil,
		}
	}

	// Get next run time (approximate based on 15-minute schedule)
	now := time.Now()
	minute := now.Minute()

	// Calculate next 15-minute mark (00, 15, 30, 45)
	var nextRun time.Time
	if minute < 15 {
		nextRun = time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 15, 0, 0, now.Location())
	} else if minute < 30 {
		nextRun = time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 30, 0, 0, now.Location())
	} else if minute < 45 {
		nextRun = time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 45, 0, 0, now.Location())
	} else {
		nextRun = time.Date(now.Year(), now.Month(), now.Day(), now.Hour()+1, 0, 0, 0, now.Location())
	}

	return SchedulerStatus{
		Status:  "running",
		Running: true,
		NextRun: &nextRun,
		JobName: "Timetable Update (Every 15 minutes)",
	}
}

// FetchAndImportTimetables fetches ICS files and imports them to database
func FetchAndImportTimetables() error {
	log.Println("[1/3] Fetching and Parse ICS files...")

	// Step 1: Fetch ICS files
	icsData, err := FetchICSFiles()
	if err != nil {
		// Log error
		if logErr := utils.LogICSImportStatistics(0, 0, 0, 0, 1); logErr != nil {
			log.Printf("WARNING: Failed to write to log file: %v", logErr)
		}
		return err
	}

	filesDownloaded := len(icsData)
	log.Printf("[1/3] Fetched and Parsed %d ICS files", filesDownloaded)

	log.Println("[3/3] Importing events to database...")

	// Step 3: Import to database
	stats, err := ImportEventsToDatabase(icsData)
	if err != nil {
		// Log error
		if logErr := utils.LogICSImportStatistics(filesDownloaded, 0, 0, 0, 1); logErr != nil {
			log.Printf("WARNING: Failed to write to log file: %v", logErr)
		}
		return err
	}

	log.Println("[3/3] Events imported successfully")

	// Step 4: Log import statistics to file
	if err := utils.LogICSImportStatistics(
		filesDownloaded,
		stats.EventsCreated,
		stats.EventsUpdated,
		stats.EventsUnchanged,
		stats.Errors,
	); err != nil {
		log.Printf("WARNING: Failed to write to log file: %v", err)
		// Don't fail the import if logging fails
	} else {
		log.Println("Successfully logged import statistics to ics_data_imports.log")
	}

	return nil
}
