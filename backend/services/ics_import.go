package services

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	ical "github.com/emersion/go-ical"
	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/models"
)

// ICSData represents fetched ICS file data
type ICSData struct {
	Zenturie string
	Content  string
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
// TODO: Configure URLs in environment variables
func FetchICSFiles() ([]ICSData, error) {
	// Example URLs - should be configured in .env
	// In production, these would be fetched from a configuration
	urls := map[string]string{
		// "I24c": "https://example.com/ics/I24c.ics",
		// "A24b": "https://example.com/ics/A24b.ics",
	}

	var icsData []ICSData

	for zenturie, url := range urls {
		log.Printf("Fetching ICS for %s from %s", zenturie, url)

		resp, err := http.Get(url)
		if err != nil {
			log.Printf("ERROR fetching ICS for %s: %v", zenturie, err)
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()

		if err != nil {
			log.Printf("ERROR reading ICS for %s: %v", zenturie, err)
			continue
		}

		icsData = append(icsData, ICSData{
			Zenturie: zenturie,
			Content:  string(body),
		})
	}

	return icsData, nil
}

// ParseICSFiles parses ICS files and extracts events
func ParseICSFiles(icsData []ICSData) (map[string][]TimetableEvent, error) {
	events := make(map[string][]TimetableEvent)

	for _, data := range icsData {
		reader := strings.NewReader(data.Content)
		decoder := ical.NewDecoder(reader)

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
				}
			}
		}
	}

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

// parseICSTime parses ICS time format
func parseICSTime(value string) (time.Time, error) {
	// Try different formats
	formats := []string{
		"20060102T150405Z",
		"20060102T150405",
		"20060102",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, value); err == nil {
			return t, nil
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
func ImportEventsToDatabase(eventsMap map[string][]TimetableEvent) error {
	for zenturieName, events := range eventsMap {
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
				continue
			}
		}

		// Import events
		for _, event := range events {
			// Check if event already exists (by UID)
			var existing models.Timetable
			result := config.DB.Where("uid = ?", event.UID).First(&existing)

			timetable := models.Timetable{
				ZenturienID: zenturie.ID,
				UID:         event.UID,
				Summary:     event.Summary,
				Description: &event.Description,
				Location:    &event.Location,
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
				}
			} else {
				// Update existing event
				config.DB.Model(&existing).Updates(timetable)
			}
		}

		log.Printf("Imported %d events for zenturie %s", len(events), zenturieName)
	}

	return nil
}

// extractYear extracts year from zenturie name (e.g., "I24c" -> "24")
func extractYear(zenturieName string) string {
	if len(zenturieName) >= 3 {
		return zenturieName[1:3]
	}
	return ""
}
