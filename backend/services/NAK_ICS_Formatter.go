package services

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"golang.org/x/net/html/charset"
)

// Event repräsentiert einen Kalendertermin
type Event struct {
	DTSTAMP               string
	TRANSP                string
	SEQUENCE              string
	UID                   string    // check
	StartTime             time.Time // check
	StartTimeRaw          string
	EndTime               time.Time // check
	EndTimeRaw            string
	Priority              string // check
	Class                 string
	Categories            string // check
	Professor             string // check added
	Break                 string // check need to add in database
	AdditionalInformation string // check need to clarify which to use in db
	// Courses
	CourseName   string // check added
	CourseNumber string // check added
	CourseType   string // check added
	// Rooms
	RoomNr   string // check
	RoomName string
}

func fetchFile(url string) ([]Event, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("HTTP GET failed: %v", err)
	}
	defer resp.Body.Close()

	// Check HTTP status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP request failed with status %d: %s", resp.StatusCode, resp.Status)
	}

	contentType := resp.Header.Get("Content-Type")
	reader, err := charset.NewReader(resp.Body, contentType)
	if err != nil {
		// Don't crash the scheduler - return error instead of log.Fatal()
		return nil, fmt.Errorf("charset conversion failed: %v", err)
	}

	body, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("ReadAll: %v", err)
	}

	events := parseNAKICS(string(body))

	return events, nil
}

func parseNAKICS(content string) []Event {
	var events []Event
	lines := strings.Split(content, "\n")

	var currentEvent *Event
	var currentField string
	var currentValue string

	for _, line := range lines {
		// Entferne nur \r am Ende, aber behalte führende Whitespaces für Continuation-Erkennung
		line = CleanLine(line)

		// Neue Event starten
		if line == "BEGIN:VEVENT" {
			currentEvent = &Event{}
			currentField = ""
			currentValue = ""
			continue
		}

		// Event beenden und zum Array hinzufügen
		if line == "END:VEVENT" && currentEvent != nil {
			// Letztes Feld speichern
			saveField(currentEvent, currentField, currentValue)
			events = append(events, *currentEvent)
			currentEvent = nil
			currentField = ""
			currentValue = ""
			continue
		}

		if currentEvent == nil {
			continue
		}

		// Handle multi Level Whitespace
		if len(line) > 0 && (line[0] == ' ' || line[0] == '\t') {
			// Handle Whitespace
			currentValue += strings.TrimLeft(line, " \t")
			continue
		}

		// New field begins close old
		if currentField != "" {
			saveField(currentEvent, currentField, currentValue)
		}

		// Parse new field
		colonIndex := strings.Index(line, ":")
		if colonIndex == -1 {
			continue
		}

		fieldPart := line[:colonIndex]
		value := line[colonIndex+1:]

		// Extract fieldName before ";"
		semicolonIndex := strings.Index(fieldPart, ";")
		if semicolonIndex != -1 {
			currentField = fieldPart[:semicolonIndex]
		} else {
			currentField = fieldPart
		}

		currentValue = value
	}

	return events
}

func CleanLine(line string) string {
	line = strings.TrimRight(line, "\r")
	line = strings.Replace(line, "\\n", " ", -1)
	return strings.Replace(line, "\\,", ", ", -1)
}

func saveField(event *Event, field string, value string) error {
	switch field {
	case "DTSTAMP":
		event.DTSTAMP = value
	case "TRANSP":
		event.TRANSP = value
	case "SEQUENCE":
		event.SEQUENCE = value
	case "UID":
		event.UID = value
	case "LOCATION":
		event.RoomNr = value
		if len(value) > 4 {
			roomPat := `(?P<roomNumber>[A-Z]\d+)`
			roomRet, roomErr := PatternSearch(value, roomPat)
			if roomErr != nil {
				fmt.Println("Error:", roomErr)
			}
			event.RoomNr = roomRet["roomNumber"]
			event.RoomName = value
		}
	case "DESCRIPTION":
		// Parse description
		descPat := `Veranstaltung: (?P<veranstaltung>.*?) Dozent: (?P<dozent>.*?) Pause: (?P<pause>.*?) Raum: (?P<raum>.*?) Anmerkung: (?P<anmerkung>.*)`
		descRet, errRet := PatternSearch(value, descPat)
		if errRet != nil {
			log.Printf("WARNING: Failed to parse description field (UID: %s): %v", event.UID, errRet)
			log.Printf("  Description content: %s", value)
			// Continue with partial data instead of failing completely
		} else {
			event.Professor = descRet["dozent"]
			event.Break = descRet["pause"]
			event.AdditionalInformation = descRet["anmerkung"]

			// Parse module description only if we successfully parsed the description
			if descRet["veranstaltung"] != "" {
				modPat := `^(?P<courseType>\S+)\s+(?P<modulNummer>\S+)\s+(?P<modulName>.*)$`
				modPatAlt := `^(?P<courseType>\S+)\s+(?P<modulName>.*)$`
				modRet, modErr := PatternSearch(descRet["veranstaltung"], modPat, modPatAlt)
				if modErr != nil {
					log.Printf("WARNING: Failed to parse module info from veranstaltung (UID: %s): %v", event.UID, modErr)
					log.Printf("  Veranstaltung content: %s", descRet["veranstaltung"])
					// Continue with partial data
				} else {
					event.CourseType = modRet["courseType"]
					event.CourseNumber = modRet["modulNummer"]
					event.CourseName = modRet["modulName"]
				}
			}
		}
	case "DTSTART":
		event.StartTimeRaw = value
		event.StartTime = parseDateTime(value)
	case "DTEND":
		event.EndTimeRaw = value
		event.EndTime = parseDateTime(value)
	case "PRIORITY":
		event.Priority = value
	case "CLASS":
		event.Class = value
	case "CATEGORIES":
		event.Categories = value
	}
	return nil
}

func PatternSearch(value string, patterns ...string) (map[string]string, error) {
	value = strings.TrimSpace(value)

	if len(patterns) == 0 {
		return nil, fmt.Errorf("mindestens ein Pattern erforderlich")
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindStringSubmatch(value)

		if matches != nil {
			names := re.SubexpNames()
			result := make(map[string]string)

			for j, name := range names {
				if j > 0 && j < len(matches) && name != "" {
					result[name] = strings.TrimSpace(matches[j])
				}
			}

			return result, nil
		}
	}

	return nil, fmt.Errorf("keines der %d Patterns matched für: '%s'", len(patterns), value)
}

func parseDateTime(value string) time.Time {
	value = strings.TrimSpace(value)

	// Format: 20251013T091500Z (UTC) or 20251013T091500 (local time)
	if strings.HasSuffix(value, "Z") {
		// UTC time with Z suffix
		t, err := time.Parse("20060102T150405Z", value)
		if err == nil {
			return t.UTC()
		}
		log.Printf("WARNING: Failed to parse UTC datetime '%s': %v", value, err)
		return time.Time{}
	}

	// Local time without Z - assume Europe/Berlin timezone (NAK is in Germany)
	berlinTZ, err := time.LoadLocation("Europe/Berlin")
	if err != nil {
		log.Printf("WARNING: Failed to load Europe/Berlin timezone, using UTC: %v", err)
		berlinTZ = time.UTC
	}

	// Try parsing as datetime with timezone
	t, err := time.ParseInLocation("20060102T150405", value, berlinTZ)
	if err == nil {
		return t.UTC() // Convert to UTC for consistent storage
	}

	// Try parsing as date only
	if len(value) == 8 {
		t, err := time.ParseInLocation("20060102", value, berlinTZ)
		if err == nil {
			return t.UTC()
		}
	}

	log.Printf("WARNING: Failed to parse datetime '%s': %v", value, err)
	return time.Time{}
}
