package services

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	ical "github.com/emersion/go-ical"
	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/models"
	"golang.org/x/text/encoding/charmap"
	"golang.org/x/text/transform"
)

// ICSData represents fetched ICS file data
type ICSData struct {
	Zenturie string
	Content  string
}

// ImportStatistics represents import statistics
type ImportStatistics struct {
	FilesDownloaded int
	EventsCreated   int
	EventsUpdated   int
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

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	successCount := 0
	errorCount := 0

	// Try each zenturie with all possible semesters (1-7)
	for _, zenturie := range zenturien {
		log.Printf("Processing zenturie: %s", zenturie.Name)

		for semester := 1; semester <= 7; semester++ {
			url := fmt.Sprintf("%s/%s_%d.ics", baseURL, zenturie.Name, semester)
			log.Printf("  Attempting to fetch: %s", url)

			resp, err := client.Get(url)
			if err != nil {
				log.Printf("  ERROR fetching ICS for %s semester %d: %v", zenturie.Name, semester, err)
				errorCount++
				continue
			}

			// Check if file exists (404 means semester doesn't exist)
			if resp.StatusCode == 404 {
				log.Printf("  No ICS file found for %s semester %d (404)", zenturie.Name, semester)
				resp.Body.Close()
				continue
			}

			if resp.StatusCode != 200 {
				log.Printf("  ERROR: Unexpected status code %d for %s semester %d", resp.StatusCode, zenturie.Name, semester)
				resp.Body.Close()
				errorCount++
				continue
			}

			body, err := io.ReadAll(resp.Body)
			resp.Body.Close()

			if err != nil {
				log.Printf("  ERROR reading ICS for %s semester %d: %v", zenturie.Name, semester, err)
				errorCount++
				continue
			}

			// Validate that we got actual ICS content
			if len(body) == 0 {
				log.Printf("  WARNING: Empty ICS file for %s semester %d", zenturie.Name, semester)
				errorCount++
				continue
			}

			// Convert from Latin-1/ISO-8859-1 to UTF-8
			utf8Body, err := convertToUTF8(body)
			if err != nil {
				log.Printf("  WARNING: Failed to convert encoding for %s semester %d: %v", zenturie.Name, semester, err)
				// Try to use as-is
				utf8Body = body
			}

			log.Printf("  Successfully fetched ICS for %s semester %d (%d bytes)", zenturie.Name, semester, len(body))
			successCount++

			icsData = append(icsData, ICSData{
				Zenturie: zenturie.Name,
				Content:  string(utf8Body),
			})
		}
	}

	log.Printf("Fetch summary: %d successful, %d errors", successCount, errorCount)
	log.Printf("Total ICS files fetched: %d", len(icsData))

	// Return error only if we couldn't fetch ANY files
	if len(icsData) == 0 && len(zenturien) > 0 {
		return nil, fmt.Errorf("failed to fetch any ICS files (tried %d zenturien)", len(zenturien))
	}

	return icsData, nil
}

// ParseICSFiles parses ICS files and extracts events
func ParseICSFiles(icsData []ICSData) (map[string][]TimetableEvent, error) {
	events := make(map[string][]TimetableEvent)

	for _, data := range icsData {
		reader := strings.NewReader(data.Content)
		decoder := ical.NewDecoder(reader)

		eventCount := 0

		for {
			cal, err := decoder.Decode()
			if err == io.EOF {
				break
			}
			if err != nil {
				log.Printf("ERROR decoding ICS for %s: %v", data.Zenturie, err)
				continue
			}

			for _, component := range cal.Children {
				if component.Name != "VEVENT" {
					continue
				}

				event := parseEvent(component)
				if event != nil {
					events[data.Zenturie] = append(events[data.Zenturie], *event)
					eventCount++
				}
			}
		}

		if eventCount > 0 {
			log.Printf("Parsed %d events for %s", eventCount, data.Zenturie)
		}
	}

	log.Printf("Total: Parsed %d zenturien with events", len(events))

	return events, nil
}

// parseEvent parses a single VEVENT component
func parseEvent(component *ical.Component) *TimetableEvent {
	event := &TimetableEvent{}

	// Get UID
	if prop := component.Props.Get("UID"); prop != nil {
		event.UID = prop.Value
	}

	// Get Summary
	if prop := component.Props.Get("SUMMARY"); prop != nil {
		event.Summary = prop.Value
	}

	// Get Description
	if prop := component.Props.Get("DESCRIPTION"); prop != nil {
		event.Description = prop.Value
	}

	// Get Location
	if prop := component.Props.Get("LOCATION"); prop != nil {
		event.Location = prop.Value
	}

	// Get Start Time
	if prop := component.Props.Get("DTSTART"); prop != nil {
		if t, err := parseICSTime(prop.Value); err == nil {
			event.StartTime = t
		}
	}

	// Get End Time
	if prop := component.Props.Get("DTEND"); prop != nil {
		if t, err := parseICSTime(prop.Value); err == nil {
			event.EndTime = t
		}
	}

	// Extract professor and course code from summary
	extractMetadata(event)

	return event
}

// parseICSTime parses ICS time format and converts to UTC
func parseICSTime(value string) (time.Time, error) {
	// Format with Z suffix is already UTC
	if strings.HasSuffix(value, "Z") {
		t, err := time.Parse("20060102T150405Z", value)
		if err == nil {
			return t.UTC(), nil
		}
	}

	// Load Europe/Berlin timezone for local times
	berlinTZ, err := time.LoadLocation("Europe/Berlin")
	if err != nil {
		// Fallback to UTC if timezone loading fails
		berlinTZ = time.UTC
		log.Printf("WARNING: Failed to load Europe/Berlin timezone, using UTC: %v", err)
	}

	// Format without Z is local time (Europe/Berlin for NAK)
	if len(value) == 15 && strings.Contains(value, "T") {
		// Parse as local time in Europe/Berlin timezone
		t, err := time.ParseInLocation("20060102T150405", value, berlinTZ)
		if err == nil {
			return t.UTC(), nil // Convert to UTC
		}
	}

	// Date only format
	if len(value) == 8 {
		t, err := time.ParseInLocation("20060102", value, berlinTZ)
		if err == nil {
			return t.UTC(), nil // Convert to UTC
		}
	}

	return time.Time{}, fmt.Errorf("unable to parse time: %s", value)
}

// extractMetadata extracts professor, course code, etc. from summary
func extractMetadata(event *TimetableEvent) {
	// Example: "V I231 Algorithmen (Prof. Dr. Müller)"
	summary := event.Summary

	// Extract course type (V, Z, etc.)
	if len(summary) > 0 {
		parts := strings.Fields(summary)
		if len(parts) > 0 {
			event.CourseType = parts[0]
		}
		if len(parts) > 1 {
			event.CourseCode = parts[1]
		}
	}

	// Extract professor from parentheses
	if start := strings.Index(summary, "("); start != -1 {
		if end := strings.Index(summary[start:], ")"); end != -1 {
			event.Professor = strings.TrimSpace(summary[start+1 : start+end])
		}
	}
}

// ImportEventsToDatabase imports parsed events to database
func ImportEventsToDatabase(eventsMap map[string][]TimetableEvent) (*ImportStatistics, error) {
	if len(eventsMap) == 0 {
		log.Println("WARNING: No events to import")
		return &ImportStatistics{}, nil
	}

	totalCreated := 0
	totalUpdated := 0
	totalErrors := 0

	for zenturieName, events := range eventsMap {
		log.Printf("Importing events for zenturie: %s (%d events)", zenturieName, len(events))

		// Find or create zenturie
		var zenturie models.Zenturie
		result := config.DB.Where("name = ?", zenturieName).First(&zenturie)

		if result.Error != nil {
			// Create zenturie if not exists
			year := extractYear(zenturieName)
			zenturie = models.Zenturie{
				Name: zenturieName,
				Year: year,
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
		errorCount := 0

		// Import events
		for _, event := range events {
			// Validate event has required fields
			if event.UID == "" || event.Summary == "" {
				log.Printf("WARNING: Skipping invalid event (missing UID or Summary)")
				errorCount++
				continue
			}

			// Clean up summary: Replace -\ with -/ first, then take only part before first \,
			cleanSummary := cleanupSummary(event.Summary)

			// Find or create course
			var courseID *uint
			if event.CourseCode != "" && event.CourseCode != "WP" {
				course := findOrCreateCourse(event.CourseCode, cleanSummary, zenturie.Year)
				if course != nil {
					courseID = &course.ID
				}
			}

			// Find or create room(s)
			var roomID *uint
			extraLocation := ""
			if event.Location != "" {
				roomID, extraLocation = findOrCreateRoom(event.Location)
			}

			// Check if event already exists (by UID)
			var existing models.Timetable
			result := config.DB.Where("uid = ?", event.UID).First(&existing)

			locationPtr := &extraLocation
			if extraLocation == "" {
				locationPtr = nil
			}

			timetable := models.Timetable{
				ZenturienID: zenturie.ID,
				CourseID:    courseID,
				RoomID:      roomID,
				UID:         event.UID,
				Summary:     cleanSummary,
				Description: &event.Description,
				Location:    locationPtr,
				StartTime:   event.StartTime,
				EndTime:     event.EndTime,
				Professor:   &event.Professor,
				CourseType:  &event.CourseType,
				CourseCode:  &event.CourseCode,
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
				if hasChanges(&existing, &timetable) {
					// Update existing event only if there are changes
					if err := config.DB.Model(&existing).Updates(timetable).Error; err != nil {
						log.Printf("ERROR updating timetable event %s: %v", event.UID, err)
						errorCount++
					} else {
						updatedCount++
					}
				}
				// If no changes, don't count as updated
			}
		}

		log.Printf("Zenturie %s: %d created, %d updated, %d errors",
			zenturieName, createdCount, updatedCount, errorCount)

		totalCreated += createdCount
		totalUpdated += updatedCount
		totalErrors += errorCount
	}

	log.Printf("Import summary: %d created, %d updated, %d errors",
		totalCreated, totalUpdated, totalErrors)

	stats := &ImportStatistics{
		EventsCreated: totalCreated,
		EventsUpdated: totalUpdated,
		Errors:        totalErrors,
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

// convertToUTF8 converts Latin-1/ISO-8859-1 encoded bytes to UTF-8
func convertToUTF8(input []byte) ([]byte, error) {
	// Create a transformer from ISO-8859-1 to UTF-8
	decoder := charmap.ISO8859_1.NewDecoder()
	reader := transform.NewReader(bytes.NewReader(input), decoder)

	// Read the converted output
	output, err := io.ReadAll(reader)
	if err != nil {
		return input, err
	}

	return output, nil
}

// findOrCreateCourse finds or creates a course by module number
func findOrCreateCourse(courseCode, summary, year string) *models.Course {
	if courseCode == "" {
		return nil
	}

	// Try to find existing course
	var course models.Course
	result := config.DB.Where("module_number = ?", courseCode).First(&course)

	if result.Error == nil {
		return &course
	}

	// Extract course name from summary (e.g., "V I157 Logistik / Operations Management")
	courseName := extractCourseName(summary)
	if courseName == "" {
		courseName = summary
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

// extractCourseName extracts course name from summary
// Example: "V I157 Logistik / Operations Management" -> "Logistik / Operations Management"
func extractCourseName(summary string) string {
	// First apply cleanup to remove everything after \,
	summary = cleanupSummary(summary)

	// Remove course type prefix (V, Z, etc.) and course code
	parts := strings.SplitN(summary, " ", 3)
	if len(parts) >= 3 {
		// Remove everything before the actual course name
		name := parts[2]
		return strings.TrimSpace(name)
	}

	return strings.TrimSpace(summary)
}

// findOrCreateRoom finds or creates room(s) from location string
// Returns the primary room ID and extra location info
func findOrCreateRoom(location string) (*uint, string) {
	if location == "" {
		return nil, ""
	}

	// Split multiple rooms (e.g., "A103, EDV-A102")
	rooms := strings.Split(location, ",")
	var primaryRoomID *uint
	extraRooms := []string{}

	for i, roomStr := range rooms {
		roomStr = strings.TrimSpace(roomStr)
		if roomStr == "" {
			continue
		}

		// Parse room number
		roomNumber := parseRoomNumber(roomStr)
		if roomNumber == "" {
			// Not a valid room, treat as extra location info
			extraRooms = append(extraRooms, roomStr)
			continue
		}

		// Find or create room
		var room models.Room
		result := config.DB.Where("room_number = ?", roomNumber).First(&room)

		if result.Error != nil {
			// Create new room
			building, floor := extractBuildingAndFloor(roomNumber)

			// Final cleanup - ensure all values are trimmed and have no backslashes
			cleanRoomNumber := strings.TrimSpace(strings.ReplaceAll(roomNumber, "\\", ""))
			cleanBuilding := strings.TrimSpace(strings.ReplaceAll(building, "\\", ""))
			cleanFloor := strings.TrimSpace(strings.ReplaceAll(floor, "\\", ""))

			room = models.Room{
				RoomNumber: cleanRoomNumber,
				Building:   cleanBuilding,
				Floor:      cleanFloor,
			}

			if err := config.DB.Create(&room).Error; err != nil {
				log.Printf("ERROR creating room %s: %v", cleanRoomNumber, err)
				extraRooms = append(extraRooms, roomStr)
				continue
			}
			log.Printf("Created new room: %s (Building: %s, Floor: %s)", cleanRoomNumber, cleanBuilding, cleanFloor)
		}

		// First room becomes the primary room
		if i == 0 {
			primaryRoomID = &room.ID
		} else {
			extraRooms = append(extraRooms, roomNumber)
		}
	}

	extraLocation := strings.Join(extraRooms, ", ")
	return primaryRoomID, extraLocation
}

// parseRoomNumber extracts room number from location string
// Examples: "A104" -> "A104", "EDV-A102" -> "A102"
func parseRoomNumber(location string) string {
	// Remove ICS escape characters (backslashes) and trim
	location = strings.ReplaceAll(location, "\\", "")
	location = strings.TrimSpace(location)

	// Handle special prefixes like "EDV-"
	if strings.Contains(location, "-") {
		parts := strings.Split(location, "-")
		if len(parts) == 2 {
			location = strings.TrimSpace(parts[1])
			// Remove backslashes again after split
			location = strings.ReplaceAll(location, "\\", "")
		}
	}

	// Final trim and backslash removal
	location = strings.ReplaceAll(location, "\\", "")
	location = strings.TrimSpace(location)

	// Check if it looks like a room number (Letter + digits)
	if len(location) >= 3 {
		// Must start with a letter and contain digits
		if (location[0] >= 'A' && location[0] <= 'Z') || (location[0] >= 'a' && location[0] <= 'z') {
			hasDigit := false
			for _, c := range location {
				if c >= '0' && c <= '9' {
					hasDigit = true
					break
				}
			}
			if hasDigit {
				// Return uppercase and trimmed
				result := strings.ToUpper(location)
				result = strings.ReplaceAll(result, "\\", "")
				return strings.TrimSpace(result)
			}
		}
	}

	return ""
}

// extractBuildingAndFloor extracts building and floor from room number
// Example: "A104" -> Building: "A", Floor: "1"
func extractBuildingAndFloor(roomNumber string) (string, string) {
	// Clean up the room number first
	roomNumber = strings.ReplaceAll(roomNumber, "\\", "")
	roomNumber = strings.TrimSpace(roomNumber)

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

// cleanupSummary cleans up the summary field
// Replace -\ with -/ first, then take only the part before the first \,
// Example: "V I148 Internet Anwendungsarchitekturen\,Gamradt\,..." -> "V I148 Internet Anwendungsarchitekturen"
func cleanupSummary(summary string) string {
	// Step 1: Replace all -\ with -/
	summary = strings.ReplaceAll(summary, "-\\", "-/")

	// Step 2: Find the first occurrence of \, (backslash-comma)
	if idx := strings.Index(summary, "\\,"); idx != -1 {
		summary = summary[:idx]
	}

	// Step 3: Final trim and remove any remaining backslashes
	summary = strings.TrimSpace(summary)
	summary = strings.ReplaceAll(summary, "\\", "")

	return summary
}

// hasChanges compares two Timetable objects and returns true if any field has changed
func hasChanges(existing, new *models.Timetable) bool {
	// Compare times (most important for updates)
	if !existing.StartTime.Equal(new.StartTime) || !existing.EndTime.Equal(new.EndTime) {
		return true
	}

	// Compare basic fields
	if existing.ZenturienID != new.ZenturienID || existing.Summary != new.Summary {
		return true
	}

	// Compare nullable uint pointers (CourseID, RoomID)
	if !compareNullableUint(existing.CourseID, new.CourseID) {
		return true
	}
	if !compareNullableUint(existing.RoomID, new.RoomID) {
		return true
	}

	// Compare nullable string pointers
	if !compareNullableString(existing.Description, new.Description) {
		return true
	}
	if !compareNullableString(existing.Location, new.Location) {
		return true
	}
	if !compareNullableString(existing.Professor, new.Professor) {
		return true
	}
	if !compareNullableString(existing.CourseType, new.CourseType) {
		return true
	}
	if !compareNullableString(existing.CourseCode, new.CourseCode) {
		return true
	}

	return false
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
func compareNullableString(a, b *string) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
}
