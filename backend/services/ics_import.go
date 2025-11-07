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
	totalUnchanged := 0
	totalErrors := 0
	debugLogCount := 0 // Only log first 5 changes for debugging

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
		unchangedCount := 0
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
			// PRIORITY: Extract room from Description field (format: "Raum: A105")
			// FALLBACK: Use Location field if no room found in Description
			var roomID *uint
			extraLocation := ""
			roomLocation := ""

			// Try to extract room from description first
			if event.Description != "" {
				roomLocation = extractRoomFromDescription(event.Description)
			}

			// Fallback to Location field if no room in description
			if roomLocation == "" && event.Location != "" {
				roomLocation = event.Location
			}

			// Parse and create room if we found a location
			if roomLocation != "" {
				roomID, extraLocation = findOrCreateRoom(roomLocation)
			}

			// Extract professor from description if not already set
			// PRIORITY: Extract from Description field (format: "Dozent: Prof. Dr. Müller")
			// FALLBACK: Use extractMetadata result (from Summary field)
			if event.Professor == "" && event.Description != "" {
				professorFromDesc := extractProfessorFromDescription(event.Description)
				if professorFromDesc != "" {
					event.Professor = professorFromDesc
				}
			}

			// Check if event already exists (by UID AND ZenturienID)
			// This allows the same UID to exist for different zenturien (Wahlpflichtmodule)
			var existing models.Timetable
			result := config.DB.Where("uid = ? AND zenturien_id = ?", event.UID, zenturie.ID).First(&existing)

			locationPtr := &extraLocation
			if extraLocation == "" {
				locationPtr = nil
			}

			// Create pointers only if strings are not empty
			var descriptionPtr *string
			if event.Description != "" {
				descriptionPtr = &event.Description
			}

			var professorPtr *string
			if event.Professor != "" {
				professorPtr = &event.Professor
			}

			var courseTypePtr *string
			if event.CourseType != "" {
				courseTypePtr = &event.CourseType
			}

			var courseCodePtr *string
			if event.CourseCode != "" {
				courseCodePtr = &event.CourseCode
			}

			timetable := models.Timetable{
				ZenturienID: zenturie.ID,
				CourseID:    courseID,
				RoomID:      roomID,
				UID:         event.UID,
				Summary:     cleanSummary,
				Description: descriptionPtr,
				Location:    locationPtr,
				StartTime:   event.StartTime,
				EndTime:     event.EndTime,
				Professor:   professorPtr,
				CourseType:  courseTypePtr,
				CourseCode:  courseCodePtr,
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
			zenturieName, createdCount, updatedCount, unchangedCount, errorCount)

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

// extractProfessorFromDescription extracts the professor from the description field
// Format: "Veranstaltung: ...\nDozent: Prof. Dr. Müller\nPause: ...\n..."
// Returns the professor string after "Dozent: " up to the next newline
func extractProfessorFromDescription(description string) string {
	if description == "" {
		return ""
	}

	// Search for "Dozent: " (case-sensitive as ICS files are consistent)
	professorPrefix := "Dozent: "
	idx := strings.Index(description, professorPrefix)
	if idx == -1 {
		// Try alternative: "Dozent:" without space
		professorPrefix = "Dozent:"
		idx = strings.Index(description, professorPrefix)
		if idx == -1 {
			return ""
		}
	}

	// Extract everything after "Dozent: "
	afterProfessor := description[idx+len(professorPrefix):]

	// Find the next newline (handle both literal \n and actual newline)
	var professor string

	// Check for literal backslash-n first (common in ICS)
	literalNewlineIdx := strings.Index(afterProfessor, "\\n")
	actualNewlineIdx := strings.Index(afterProfessor, "\n")

	// Use whichever comes first
	newlineIdx := -1
	if literalNewlineIdx != -1 && actualNewlineIdx != -1 {
		if literalNewlineIdx < actualNewlineIdx {
			newlineIdx = literalNewlineIdx
		} else {
			newlineIdx = actualNewlineIdx
		}
	} else if literalNewlineIdx != -1 {
		newlineIdx = literalNewlineIdx
	} else if actualNewlineIdx != -1 {
		newlineIdx = actualNewlineIdx
	}

	if newlineIdx != -1 {
		professor = afterProfessor[:newlineIdx]
	} else {
		// No newline found, take everything until the end
		professor = afterProfessor
	}

	// Trim whitespace and handle "-" which means "no professor"
	professor = strings.TrimSpace(professor)
	if professor == "-" || professor == "" {
		return ""
	}

	return professor
}

// extractRoomFromDescription extracts the room from the description field
// Format: "Veranstaltung: ...\nDozent: ...\nRaum: A105\n..."
// Returns the room string after "Raum: " up to the next newline
func extractRoomFromDescription(description string) string {
	if description == "" {
		return ""
	}

	// Search for "Raum: " (case-sensitive as ICS files are consistent)
	roomPrefix := "Raum: "
	idx := strings.Index(description, roomPrefix)
	if idx == -1 {
		// Try alternative: "Raum:" without space
		roomPrefix = "Raum:"
		idx = strings.Index(description, roomPrefix)
		if idx == -1 {
			return ""
		}
	}

	// Extract everything after "Raum: "
	afterRoom := description[idx+len(roomPrefix):]

	// Find the next newline (handle both literal \n and actual newline)
	// ICS files can have literal "\n" (backslash + n) or actual newline character
	var room string

	// Check for literal backslash-n first (common in ICS)
	literalNewlineIdx := strings.Index(afterRoom, "\\n")
	actualNewlineIdx := strings.Index(afterRoom, "\n")

	// Use whichever comes first
	newlineIdx := -1
	if literalNewlineIdx != -1 && actualNewlineIdx != -1 {
		if literalNewlineIdx < actualNewlineIdx {
			newlineIdx = literalNewlineIdx
		} else {
			newlineIdx = actualNewlineIdx
		}
	} else if literalNewlineIdx != -1 {
		newlineIdx = literalNewlineIdx
	} else if actualNewlineIdx != -1 {
		newlineIdx = actualNewlineIdx
	}

	if newlineIdx != -1 {
		room = afterRoom[:newlineIdx]
	} else {
		// No newline found, take everything until the end
		room = afterRoom
	}

	// Trim whitespace and handle "-" which means "no room"
	room = strings.TrimSpace(room)
	if room == "-" || room == "" {
		return ""
	}

	return room
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
// Examples: "A104" -> "A104", "EDV-A102" -> "A102", "A 001" -> "A001"
// Format: Letter + exactly 3 digits (4 characters total)
// Stops at: backslash, newline, or other invalid characters
func parseRoomNumber(location string) string {
	// Trim initial whitespace
	location = strings.TrimSpace(location)

	// CRITICAL: Stop at backslash (prevents "C007\nAnmerkung" -> "C007NANMERKUNG")
	if idx := strings.Index(location, "\\"); idx != -1 {
		location = location[:idx]
		location = strings.TrimSpace(location)
	}

	// Handle special prefixes like "EDV-"
	if strings.Contains(location, "-") {
		parts := strings.Split(location, "-")
		if len(parts) == 2 {
			location = strings.TrimSpace(parts[1])
		}
	}

	// Remove spaces (handles "A 001" -> "A001")
	location = strings.ReplaceAll(location, " ", "")
	location = strings.TrimSpace(location)

	// Extract only valid room number: Letter + exactly 3 digits (4 characters total)
	var roomNumber strings.Builder
	digitCount := 0

	for i, c := range location {
		if i == 0 {
			// First character must be a letter
			if (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') {
				roomNumber.WriteRune(c)
			} else {
				return "" // Invalid start
			}
		} else if c >= '0' && c <= '9' {
			// Accept digits (exactly 3 expected)
			roomNumber.WriteRune(c)
			digitCount++
			// Stop after 3 digits - no trailing letters allowed
			if digitCount == 3 {
				break
			}
		} else {
			// Stop at any other character (including letters after the initial letter)
			break
		}
	}

	result := strings.ToUpper(roomNumber.String())

	// Validate: Must have exactly 4 characters (letter + 3 digits)
	if len(result) == 4 && digitCount == 3 {
		return result
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
