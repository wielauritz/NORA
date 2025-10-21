package handlers

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/middleware"
	"github.com/nora-nak/backend/models"
)

// RoomOccupancyEvent represents a room occupancy event
type RoomOccupancyEvent struct {
	EventType string     `json:"event_type"`
	StartTime time.Time  `json:"start_time"`
	EndTime   time.Time  `json:"end_time"`
	Details   *string    `json:"details,omitempty"`
}

// RoomDetailResponse represents room details with occupancy
type RoomDetailResponse struct {
	Room      RoomResponse         `json:"room"`
	Occupancy []RoomOccupancyEvent `json:"occupancy"`
}

// FreeRoomsResponse represents free rooms query result
type FreeRoomsResponse struct {
	FreeRooms  []RoomResponse `json:"free_rooms"`
	TotalCount int            `json:"total_count"`
	StartTime  time.Time      `json:"start_time"`
	EndTime    time.Time      `json:"end_time"`
}

// GetRooms returns all rooms
// GET /v1/rooms
func GetRooms(c *fiber.Ctx) error {
	var rooms []models.Room
	if err := config.DB.Order("room_number").Find(&rooms).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to fetch rooms",
		})
	}

	response := make([]RoomResponse, len(rooms))
	for i, room := range rooms {
		response[i] = RoomResponse{
			ID:         room.ID,
			RoomNumber: room.RoomNumber,
			Building:   room.Building,
			Floor:      room.Floor,
			RoomName:   room.RoomName,
		}
	}

	return c.JSON(response)
}

// GetRoomDetails returns room details including occupancy
// GET /v1/room?room_number=D102
func GetRoomDetails(c *fiber.Ctx) error {
	roomNumber := c.Query("room_number")
	if roomNumber == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "room_number parameter required",
		})
	}

	// Find room
	var room models.Room
	if err := config.DB.Where("room_number = ?", roomNumber).First(&room).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "Raum nicht gefunden",
		})
	}

	// Time range: Today + 7 days
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfWeek := startOfDay.AddDate(0, 0, 7)

	var occupancy []RoomOccupancyEvent

	// Timetable events for this room
	var timetables []models.Timetable
	config.DB.Where("room_id = ? AND start_time >= ? AND start_time <= ?",
		room.ID, startOfDay, endOfWeek).Order("start_time").Find(&timetables)

	for _, tt := range timetables {
		details := tt.Summary
		if tt.Professor != nil {
			details = fmt.Sprintf("%s (%s)", tt.Summary, *tt.Professor)
		}

		occupancy = append(occupancy, RoomOccupancyEvent{
			EventType: "timetable",
			StartTime: tt.StartTime,
			EndTime:   tt.EndTime,
			Details:   &details,
		})
	}

	// Custom hours for this room (no details for privacy)
	var customHours []models.CustomHour
	config.DB.Where("room_id = ? AND start_time >= ? AND start_time <= ?",
		room.ID, startOfDay, endOfWeek).Order("start_time").Find(&customHours)

	for _, ch := range customHours {
		occupancy = append(occupancy, RoomOccupancyEvent{
			EventType: "custom_hour_blocked",
			StartTime: ch.StartTime,
			EndTime:   ch.EndTime,
			Details:   nil, // Privacy: no details
		})
	}

	return c.JSON(RoomDetailResponse{
		Room: RoomResponse{
			ID:         room.ID,
			RoomNumber: room.RoomNumber,
			Building:   room.Building,
			Floor:      room.Floor,
			RoomName:   room.RoomName,
		},
		Occupancy: occupancy,
	})
}

// GetFreeRooms returns all free rooms in a time range
// GET /v1/free-rooms?start_time=2025-01-20T08:00:00Z&end_time=2025-01-20T10:00:00Z
func GetFreeRooms(c *fiber.Ctx) error {
	startTimeStr := c.Query("start_time")
	endTimeStr := c.Query("end_time")

	if startTimeStr == "" || endTimeStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "start_time and end_time parameters required (ISO format)",
		})
	}

	// Parse times
	startTime, err1 := time.Parse(time.RFC3339, startTimeStr)
	endTime, err2 := time.Parse(time.RFC3339, endTimeStr)

	if err1 != nil || err2 != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid time format. Use ISO 8601 format (e.g., 2025-01-20T08:00:00Z)",
		})
	}

	// Validate time range
	if startTime.After(endTime) || startTime.Equal(endTime) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "start_time muss vor end_time liegen",
		})
	}

	// Get all rooms
	var allRooms []models.Room
	config.DB.Find(&allRooms)

	var freeRooms []RoomResponse

	for _, room := range allRooms {
		// Check for timetable conflicts
		// Two time ranges overlap if: start1 < end2 AND end1 > start2
		var timetableCount int64
		config.DB.Model(&models.Timetable{}).Where(
			"room_id = ? AND start_time < ? AND end_time > ?",
			room.ID, endTime, startTime,
		).Count(&timetableCount)

		// Check for custom hour conflicts
		var customHourCount int64
		config.DB.Model(&models.CustomHour{}).Where(
			"room_id = ? AND start_time < ? AND end_time > ?",
			room.ID, endTime, startTime,
		).Count(&customHourCount)

		// Room is free if no conflicts
		if timetableCount == 0 && customHourCount == 0 {
			freeRooms = append(freeRooms, RoomResponse{
				ID:         room.ID,
				RoomNumber: room.RoomNumber,
				Building:   room.Building,
				Floor:      room.Floor,
				RoomName:   room.RoomName,
			})
		}
	}

	return c.JSON(FreeRoomsResponse{
		FreeRooms:  freeRooms,
		TotalCount: len(freeRooms),
		StartTime:  startTime,
		EndTime:    endTime,
	})
}

// DeleteCustomHour deletes a custom hour
// DELETE /v1/delete?session_id=...&custom_hour_id=123
func DeleteCustomHour(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	customHourID := c.QueryInt("custom_hour_id", 0)
	if customHourID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "custom_hour_id parameter required",
		})
	}

	// Find custom hour
	var customHour models.CustomHour
	if err := config.DB.Where("id = ? AND user_id = ?", customHourID, user.ID).First(&customHour).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "Custom Hour nicht gefunden oder keine Berechtigung",
		})
	}

	// Delete
	config.DB.Delete(&customHour)

	return c.JSON(MessageResponse{
		Message: "Custom Hour erfolgreich gelöscht",
	})
}
