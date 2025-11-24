package handlers

import (
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/models"
)

// GetICSSubscription generates ICS calendar file for subscription
// GET /v1/subscription/:uuid.ics
func GetICSSubscription(c *fiber.Ctx) error {
	subscriptionUUID := c.Params("uuid")
	if subscriptionUUID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Subscription UUID required",
		})
	}

	// Remove .ics extension if present
	subscriptionUUID = strings.TrimSuffix(subscriptionUUID, ".ics")

	// Find user by subscription UUID
	var user models.User
	if err := config.DB.Where("subscription_uuid = ?", subscriptionUUID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "Invalid subscription UUID",
		})
	}

	// Time range: Next 6 months
	now := time.Now()
	endDate := now.AddDate(0, 6, 0)
	startDate := now.AddDate(-4, 0, 0)

	var events []string

	// Add timetable events
	if user.ZenturienID != nil {
		var timetables []models.Timetable
		config.DB.Preload("Room").Where("zenturien_id = ? AND start_time >= ? AND start_time <= ?",
			*user.ZenturienID, startDate, endDate).Find(&timetables)

		for _, tt := range timetables {
			location := ""
			if tt.Room != nil {
				location = tt.Room.RoomNumber
			} else if tt.Location != nil {
				location = *tt.Location
			}

			event := generateICSEvent(
				tt.UID,
				tt.Summary,
				strings.Replace(stringValue(tt.Description), "\\n", "\n", -1),
				location,
				tt.StartTime,
				tt.EndTime,
			)
			events = append(events, event)
		}
	}

	// Add custom hours
	var customHours []models.CustomHour
	config.DB.Preload("Room").Where("user_id = ? AND start_time >= ? AND start_time <= ?",
		user.ID, now, endDate).Find(&customHours)

	for _, ch := range customHours {
		location := ""
		if ch.Room != nil {
			location = ch.Room.RoomNumber
		} else if ch.CustomLocation != nil {
			location = *ch.CustomLocation
		}

		uid := fmt.Sprintf("custom-%d@nora-nak.de", ch.ID)
		event := generateICSEvent(
			uid,
			ch.Title,
			stringValue(ch.Description),
			location,
			ch.StartTime,
			ch.EndTime,
		)
		events = append(events, event)
	}

	// Add exams
	var exams []models.Exam
	config.DB.Preload("Course").Preload("Room").
		Where("user_id = ? AND start_time >= ? AND start_time <= ?",
			user.ID, now, endDate).Find(&exams)

	for _, exam := range exams {
		location := ""
		if exam.Room != nil {
			location = exam.Room.RoomNumber
		}

		uid := fmt.Sprintf("exam-%d@nora-nak.de", exam.ID)
		summary := fmt.Sprintf("Klausur: %s (%s)", exam.Course.Name, exam.Course.ModuleNumber)
		description := fmt.Sprintf("Dauer: %d Minuten", exam.Duration)
		endTime := exam.StartTime.Add(time.Duration(exam.Duration) * time.Minute)

		event := generateICSEvent(
			uid,
			summary,
			description,
			location,
			exam.StartTime,
			endTime,
		)
		events = append(events, event)
	}

	// Build ICS file
	icsContent := buildICSFile(events)

	c.Set("Content-Type", "text/calendar; charset=utf-8")
	c.Set("Content-Disposition", "attachment; filename=nora-calendar.ics")
	return c.SendString(icsContent)
}

// generateICSEvent creates an ICS VEVENT string
func generateICSEvent(uid, summary, description, location string, startTime, endTime time.Time) string {
	// Format times in ICS format (YYYYMMDDTHHMMSSZ)
	formatICSTime := func(t time.Time) string {
		return t.UTC().Format("20060102T150405Z")
	}

	// Escape special characters in ICS
	escapeICS := func(s string) string {
		s = strings.ReplaceAll(s, "\\", "\\\\")
		s = strings.ReplaceAll(s, ";", "\\;")
		s = strings.ReplaceAll(s, ",", "\\,")
		s = strings.ReplaceAll(s, "\n", "\\n")
		return s
	}

	event := fmt.Sprintf(`BEGIN:VEVENT
UID:%s
DTSTAMP:%s
DTSTART:%s
DTEND:%s
SUMMARY:%s`,
		uid,
		formatICSTime(time.Now()),
		formatICSTime(startTime),
		formatICSTime(endTime),
		escapeICS(summary),
	)

	if description != "" {
		event += fmt.Sprintf("\nDESCRIPTION:%s", escapeICS(description))
	}

	if location != "" {
		event += fmt.Sprintf("\nLOCATION:%s", escapeICS(location))
	}

	event += "\nEND:VEVENT"

	return event
}

// buildICSFile creates complete ICS file
func buildICSFile(events []string) string {
	ics := `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NORA//NAK Stundenplan//DE
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:NORA Stundenplan
X-WR-TIMEZONE:Europe/Berlin
`

	for _, event := range events {
		ics += event + "\n"
	}

	ics += "END:VCALENDAR"

	return ics
}

// stringValue helper to safely get string value from pointer
func stringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
