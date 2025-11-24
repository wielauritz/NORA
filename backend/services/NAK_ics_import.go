package services

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/models"
)

// ICSData represents fetched ICS file data
type ICSData struct {
	Zenturie  string
	EventList []Event
}

// ImportStatistics represents import statistics
type ImportStatistics struct {
	FilesDownloaded int
	EventsCreated   int
	EventsUpdated   int
	EventsUnchanged int
	Errors          int
}

// TimetableEvent represents a parsed event
type TimetableEvent struct {
	UID         string
	Summary     string
	Description string
	Location    string
	StartTime   time.Time
	EndTime     time.Time
	Professor   string
	CourseCode  string
	CourseType  string
}

// FetchICSFiles fetches ICS files from external source
// Fetches all zenturien from database and tries all semesters (1-7)
func FetchICSFiles() ([]ICSData, error) {
	// Get all zenturien from database
	var zenturien []models.Zenturie
	if err := config.DB.Find(&zenturien).Error; err != nil {
		log.Printf("ERROR fetching zenturien from database: %v", err)
		return nil, err
	}

	if len(zenturien) == 0 {
		log.Println("WARNING: No zenturien found in database")
		return []ICSData{}, nil
	}

	log.Printf("Found %d zenturien in database", len(zenturien))

	var icsData []ICSData
	baseURL := config.AppConfig.ICSBaseURL

	// Try each zenturie with all possible semesters (1-7)
	for _, zenturie := range zenturien {
		log.Printf("Processing zenturie: %s", zenturie.Name)

		for semester := 1; semester <= 7; semester++ {
			url := fmt.Sprintf("%s/%s_%d.ics", baseURL, zenturie.Name, semester)
			log.Printf("  Attempting to fetch: %s", url)
			content, err := fetchFile(url)
			if err != nil {
				log.Printf("  WARNING: Failed to fetch %s: %v", url, err)
				continue // Skip this file and try the next one
			}

			// Only add if we successfully fetched events
			if len(content) > 0 {
				icsData = append(icsData, ICSData{
					Zenturie:  zenturie.Name,
					EventList: content,
				})
				log.Printf("  Successfully fetched %d events from %s", len(content), url)
			} else {
				log.Printf("  WARNING: No events found in %s", url)
			}
		}
	}

	if len(icsData) == 0 && len(zenturien) > 0 {
		return nil, fmt.Errorf("failed to fetch any ICS files (tried %d zenturien)", len(zenturien))
	}

	return icsData, nil
}

// ImportEventsToDatabase imports parsed events to database
func ImportEventsToDatabase(eventsList []ICSData) (*ImportStatistics, error) {
	if len(eventsList) == 0 {
		log.Println("WARNING: No events to import")
		return &ImportStatistics{}, nil
	}

	totalCreated := 0
	totalUpdated := 0
	totalUnchanged := 0
	totalErrors := 0
	debugLogCount := 0 // Only log first 5 changes for debugging

	for _, events := range eventsList {
		log.Printf("Importing events for zenturie: %s (%d events)", events.Zenturie, len(events.EventList))

		// Find or create zenturie
		var zenturie models.Zenturie
		result := config.DB.Where("name = ?", events.Zenturie).First(&zenturie)

		if result.Error != nil {
			// Create zenturie if not exists
			zenturieName := events.Zenturie
			zenturie = models.Zenturie{
				Name: zenturieName,
				Year: extractYear(zenturieName),
			}
			if err := config.DB.Create(&zenturie).Error; err != nil {
				log.Printf("ERROR creating zenturie %s: %v", zenturieName, err)
				totalErrors++
				continue
			}
			log.Printf("Created new zenturie: %s", zenturieName)
		}

		createdCount := 0
		updatedCount := 0
		unchangedCount := 0
		errorCount := 0

		// Import events
		for _, event := range events.EventList {
			// Validate event has required fields
			if event.UID == "" {
				log.Printf("WARNING: Skipping invalid event (missing UID or Summary)")
				errorCount++
				continue
			}

			// Find or create course
			var courseID *uint
			if event.CourseType != "" && event.CourseType != "WP" && event.CourseType != "Z" {
				course := findOrCreateCourse(event.CourseNumber, event.CourseName, zenturie.Year)
				if course != nil {
					courseID = &course.ID
				}
			}

			// Parse and create room if we found a location

			roomID := findOrCreateRoom(event.RoomNr, event.RoomName)

			// Check if event already exists (by UID AND ZenturienID)
			// This allows the same UID to exist for different zenturien (Wahlpflichtmodule)
			var existing models.Timetable
			result := config.DB.Where("uid = ? AND zenturien_id = ?", event.UID, zenturie.ID).First(&existing)

			a := "as"
			timetable := models.Timetable{
				ZenturienID: zenturie.ID,
				CourseID:    courseID,
				RoomID:      roomID,
				UID:         event.UID,
				Summary:     "TODO",
				Description: &a,
				Location:    &event.RoomName,
				StartTime:   event.StartTime,
				EndTime:     event.EndTime,
				Professor:   &event.Professor,
				CourseType:  &event.CourseType,
				CourseCode:  &event.CourseNumber,
			}

			if result.Error != nil {
				// Create new event
				if err := config.DB.Create(&timetable).Error; err != nil {
					log.Printf("ERROR creating timetable event %s: %v", event.UID, err)
					errorCount++
				} else {
					createdCount++
				}
			} else {
				// Check if anything actually changed
				hasChanged := false
				if debugLogCount < 5 {
					// Enable detailed logging for first 5 comparisons
					hasChanged = hasChangesDetailed(&existing, &timetable, true)
					debugLogCount++
				} else {
					hasChanged = hasChangesDetailed(&existing, &timetable, false)
				}

				if hasChanged {
					// Update existing event only if there are changes
					if err := config.DB.Model(&existing).Updates(timetable).Error; err != nil {
						log.Printf("ERROR updating timetable event %s: %v", event.UID, err)
						errorCount++
					} else {
						updatedCount++
					}
				} else {
					// No changes, count as unchanged
					unchangedCount++
				}
			}
		}

		log.Printf("Zenturie %s: %d created, %d updated, %d unchanged, %d errors",
			zenturie.Name, createdCount, updatedCount, unchangedCount, errorCount)

		totalCreated += createdCount
		totalUpdated += updatedCount
		totalUnchanged += unchangedCount
		totalErrors += errorCount
	}

	log.Printf("Import summary: %d created, %d updated, %d unchanged, %d errors",
		totalCreated, totalUpdated, totalUnchanged, totalErrors)

	stats := &ImportStatistics{
		EventsCreated:   totalCreated,
		EventsUpdated:   totalUpdated,
		EventsUnchanged: totalUnchanged,
		Errors:          totalErrors,
	}

	return stats, nil
}

// extractYear extracts year from zenturie name (e.g., "I24c" -> "24")
func extractYear(zenturieName string) string {
	if len(zenturieName) >= 3 {
		return zenturieName[1:3]
	}
	return ""
}

// findOrCreateCourse finds or creates a course by module number
func findOrCreateCourse(courseCode string, courseName string, year string) *models.Course {
	if courseCode == "" {
		return nil
	}

	// Try to find existing course
	var course models.Course
	result := config.DB.Where("module_number = ?", courseCode).First(&course)

	if result.Error == nil {
		return &course
	}

	// Create new course
	course = models.Course{
		ModuleNumber: courseCode,
		Name:         courseName,
		Year:         year,
	}

	if err := config.DB.Create(&course).Error; err != nil {
		log.Printf("ERROR creating course %s: %v", courseCode, err)
		return nil
	}

	log.Printf("Created new course: %s - %s", courseCode, courseName)
	return &course
}

// findOrCreateRoom finds or creates room(s) from location string
// Returns the primary room ID and extra location info
func findOrCreateRoom(location string, roomName string) *uint {
	if location == "" {
		return nil
	}
	// Find or create room
	var room models.Room
	result := config.DB.Where("room_number = ?", location).First(&room)
	if result.Error != nil {
		// Create new room
		building, floor := extractBuildingAndFloor(location)
		room = models.Room{
			RoomNumber: location,
			Building:   building,
			Floor:      floor,
			RoomName:   &roomName,
		}
		if err := config.DB.Create(&room).Error; err != nil {
			log.Printf("ERROR creating room %s: %v", location, err)
		}
		log.Printf("Created new room: %s (Building: %s, Floor: %s)", location, building, floor)
	}

	return &room.ID
}

// extractBuildingAndFloor extracts building and floor from room number
// Example: "A104" -> Building: "A", Floor: "1"
func extractBuildingAndFloor(roomNumber string) (string, string) {
	if len(roomNumber) < 2 {
		return "", ""
	}

	// Building is the first letter
	building := strings.TrimSpace(string(roomNumber[0]))

	// Floor is typically the first digit after the letter
	floor := ""
	for i := 1; i < len(roomNumber); i++ {
		if roomNumber[i] >= '0' && roomNumber[i] <= '9' {
			floor = strings.TrimSpace(string(roomNumber[i]))
			break
		}
	}

	return building, floor
}

// hasChangesDetailed compares two Timetable objects with optional detailed logging
func hasChangesDetailed(existing, new *models.Timetable, enableLogging bool) bool {
	changed := false
	var reasons []string

	// Compare times (most important for updates)
	// Truncate to seconds to avoid nanosecond differences
	existingStart := existing.StartTime.Truncate(time.Second)
	newStart := new.StartTime.Truncate(time.Second)
	existingEnd := existing.EndTime.Truncate(time.Second)
	newEnd := new.EndTime.Truncate(time.Second)

	if !existingStart.Equal(newStart) {
		changed = true
		reasons = append(reasons, fmt.Sprintf("StartTime: %v -> %v (diff: %v)", existingStart, newStart, newStart.Sub(existingStart)))
	}
	if !existingEnd.Equal(newEnd) {
		changed = true
		reasons = append(reasons, fmt.Sprintf("EndTime: %v -> %v (diff: %v)", existingEnd, newEnd, newEnd.Sub(existingEnd)))
	}

	// Compare basic fields
	if existing.ZenturienID != new.ZenturienID {
		changed = true
		reasons = append(reasons, fmt.Sprintf("ZenturienID: %d -> %d", existing.ZenturienID, new.ZenturienID))
	}
	if existing.Summary != new.Summary {
		changed = true
		reasons = append(reasons, fmt.Sprintf("Summary: '%s' -> '%s'", existing.Summary, new.Summary))
	}

	// Compare nullable uint pointers (CourseID, RoomID)
	if !compareNullableUint(existing.CourseID, new.CourseID) {
		changed = true
		reasons = append(reasons, fmt.Sprintf("CourseID: %v -> %v", ptrToString(existing.CourseID), ptrToString(new.CourseID)))
	}
	if !compareNullableUint(existing.RoomID, new.RoomID) {
		changed = true
		reasons = append(reasons, fmt.Sprintf("RoomID: %v -> %v", ptrToString(existing.RoomID), ptrToString(new.RoomID)))
	}

	// Compare nullable string pointers
	if !compareNullableString(existing.Description, new.Description) {
		changed = true
		reasons = append(reasons, fmt.Sprintf("Description: '%s' -> '%s'", ptrToStringStr(existing.Description), ptrToStringStr(new.Description)))
	}
	if !compareNullableString(existing.Location, new.Location) {
		changed = true
		reasons = append(reasons, fmt.Sprintf("Location: '%s' -> '%s'", ptrToStringStr(existing.Location), ptrToStringStr(new.Location)))
	}
	if !compareNullableString(existing.Professor, new.Professor) {
		changed = true
		reasons = append(reasons, fmt.Sprintf("Professor: '%s' -> '%s'", ptrToStringStr(existing.Professor), ptrToStringStr(new.Professor)))
	}
	if !compareNullableString(existing.CourseType, new.CourseType) {
		changed = true
		reasons = append(reasons, fmt.Sprintf("CourseType: '%s' -> '%s'", ptrToStringStr(existing.CourseType), ptrToStringStr(new.CourseType)))
	}
	if !compareNullableString(existing.CourseCode, new.CourseCode) {
		changed = true
		reasons = append(reasons, fmt.Sprintf("CourseCode: '%s' -> '%s'", ptrToStringStr(existing.CourseCode), ptrToStringStr(new.CourseCode)))
	}

	// Log changes if requested
	if enableLogging {
		if changed && len(reasons) > 0 {
			log.Printf("  ⚠️ CHANGE DETECTED for UID %s:", existing.UID)
			for _, reason := range reasons {
				log.Printf("    - %s", reason)
			}
		} else {
			log.Printf("  ✓ No changes for UID %s", existing.UID)
		}
	}

	return changed
}

// Helper functions to convert pointers to readable strings
func ptrToString(p *uint) string {
	if p == nil {
		return "nil"
	}
	return fmt.Sprintf("%d", *p)
}

func ptrToStringStr(p *string) string {
	if p == nil {
		return "nil"
	}
	return *p
}

// compareNullableUint compares two nullable uint pointers
func compareNullableUint(a, b *uint) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
}

// compareNullableString compares two nullable string pointers
// Treats empty strings ("") as equivalent to nil
func compareNullableString(a, b *string) bool {
	// Get actual values, treating nil and empty string as equivalent
	aVal := ""
	bVal := ""

	if a != nil {
		aVal = *a
	}
	if b != nil {
		bVal = *b
	}

	// Compare the values (both nil and "" are now "")
	return aVal == bVal
}
