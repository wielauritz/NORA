package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/middleware"
	"github.com/nora-nak/backend/models"
)

// UserResponse represents user information
type UserResponse struct {
	UserID           uint    `json:"user_id"`
	Initials         string  `json:"initials"`
	FirstName        string  `json:"first_name"`
	LastName         string  `json:"last_name"`
	SubscriptionUUID *string `json:"subscription_uuid,omitempty"`
	Zenturie         *string `json:"zenturie,omitempty"`
	Year             *string `json:"year,omitempty"`
}

// ZenturieResponse represents zenturie information
type ZenturieResponse struct {
	Zenturie string `json:"zenturie"`
	Year     string `json:"year"`
}

// ZenturieSetRequest for setting user's zenturie
type ZenturieSetRequest struct {
	Zenturie string `json:"zenturie" validate:"required"`
}

// CourseResponse represents course information
type CourseResponse struct {
	ID           uint   `json:"id"`
	ModuleNumber string `json:"module_number"`
	Name         string `json:"name"`
}

// ExamResponse represents exam information
type ExamResponse struct {
	ID           uint      `json:"id"`
	CourseName   string    `json:"course_name"`
	ModuleNumber string    `json:"module_number"`
	StartTime    time.Time `json:"start_time"`
	Duration     int       `json:"duration"`
	IsVerified   bool      `json:"is_verified"`
	Room         *string   `json:"room,omitempty"`
}

// FriendResponse represents friend information
type FriendResponse struct {
	UserID    uint    `json:"user_id"`
	Zenturie  *string `json:"zenturie,omitempty"`
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	Initials  string  `json:"initials"`
}

// FriendAddRequest for adding a friend
type FriendAddRequest struct {
	FriendMail string `json:"friend_mail" validate:"required,email"`
}

// RoomResponse represents room information
type RoomResponse struct {
	ID         uint    `json:"id"`
	RoomNumber string  `json:"room_number"`
	Building   string  `json:"building"`
	Floor      string  `json:"floor"`
	RoomName   *string `json:"room_name,omitempty"`
}

// CustomHourCreateRequest for creating custom hours
type CustomHourCreateRequest struct {
	Title          string    `json:"title" validate:"required"`
	Description    *string   `json:"description"`
	StartTime      time.Time `json:"start_time" validate:"required"`
	EndTime        time.Time `json:"end_time" validate:"required"`
	Room           *string   `json:"room"`
	CustomLocation *string   `json:"custom_location"`
}

// CustomHourUpdateRequest for updating custom hours
type CustomHourUpdateRequest struct {
	CustomHourID   uint       `json:"custom_hour_id" validate:"required"`
	Title          *string    `json:"title"`
	Description    *string    `json:"description"`
	StartTime      *time.Time `json:"start_time"`
	EndTime        *time.Time `json:"end_time"`
	Room           *string    `json:"room"`
	CustomLocation *string    `json:"custom_location"`
}

// ExamCreateRequest for adding exams
type ExamCreateRequest struct {
	Course    string    `json:"course" validate:"required"`
	StartTime time.Time `json:"start_time" validate:"required"`
	Duration  int       `json:"duration" validate:"required,oneof=30 45 60 90 120"`
	Room      *string   `json:"room"`
}

// MessageResponse for generic success messages
type MessageResponse struct {
	Message string `json:"message"`
}

// GetUser returns user information
// GET /v1/user?session_id=...
func GetUser(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	var zenturieName, zenturieYear *string

	if user.ZenturienID != nil {
		var zenturie models.Zenturie
		if err := config.DB.First(&zenturie, *user.ZenturienID).Error; err == nil {
			zenturieName = &zenturie.Name
			zenturieYear = &zenturie.Year
		}
	}

	return c.JSON(UserResponse{
		UserID:           user.ID,
		Initials:         user.Initials,
		FirstName:        user.FirstName,
		LastName:         user.LastName,
		SubscriptionUUID: user.SubscriptionUUID,
		Zenturie:         zenturieName,
		Year:             zenturieYear,
	})
}

// GetAllZenturien returns all available zenturien
// GET /v1/all_zenturie
func GetAllZenturien(c *fiber.Ctx) error {
	var zenturien []models.Zenturie
	if err := config.DB.Order("name").Find(&zenturien).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to fetch zenturien",
		})
	}

	response := make([]ZenturieResponse, len(zenturien))
	for i, z := range zenturien {
		response[i] = ZenturieResponse{
			Zenturie: z.Name,
			Year:     z.Year,
		}
	}

	return c.JSON(response)
}

// SetZenturie sets user's zenturie
// POST /v1/zenturie?session_id=...
func SetZenturie(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	var req ZenturieSetRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid request body",
		})
	}

	// Find zenturie
	var zenturie models.Zenturie
	if err := config.DB.Where("name = ?", req.Zenturie).First(&zenturie).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "Zenturie '" + req.Zenturie + "' nicht gefunden",
		})
	}

	// Update user's zenturie
	user.ZenturienID = &zenturie.ID
	config.DB.Save(user)

	return c.JSON(MessageResponse{
		Message: "Zenturie erfolgreich auf '" + zenturie.Name + "' gesetzt",
	})
}

// GetCourses returns all available courses
// GET /v1/courses?session_id=...
func GetCourses(c *fiber.Ctx) error {
	var courses []models.Course
	if err := config.DB.Order("module_number").Find(&courses).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to fetch courses",
		})
	}

	response := make([]CourseResponse, len(courses))
	for i, course := range courses {
		response[i] = CourseResponse{
			ID:           course.ID,
			ModuleNumber: course.ModuleNumber,
			Name:         course.Name,
		}
	}

	return c.JSON(response)
}

// GetEvents returns all events for a specific date (timetables + custom hours)
// GET /v1/events?session_id=...&date=2025-01-20
func GetEvents(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	dateStr := c.Query("date")
	if dateStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Date parameter required (YYYY-MM-DD)",
		})
	}

	// Parse date in UTC
	eventDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Ungültiges Datumsformat. Nutze YYYY-MM-DD",
		})
	}

	// Start and end of day in UTC
	startOfDay := time.Date(eventDate.Year(), eventDate.Month(), eventDate.Day(), 0, 0, 0, 0, time.UTC)
	endOfDay := time.Date(eventDate.Year(), eventDate.Month(), eventDate.Day(), 23, 59, 59, 999999999, time.UTC)

	events := make([]map[string]interface{}, 0)

	// Timetable events for user's zenturie
	if user.ZenturienID != nil {
		var timetables []models.Timetable
		config.DB.Where("zenturien_id = ? AND start_time >= ? AND start_time <= ?",
			*user.ZenturienID, startOfDay, endOfDay).Find(&timetables)

		for _, tt := range timetables {
			events = append(events, map[string]interface{}{
				"event_type":   "timetable",
				"title":        tt.Summary,
				"start_time":   tt.StartTime.UTC().Format(time.RFC3339),
				"end_time":     tt.EndTime.UTC().Format(time.RFC3339),
				"location":     tt.Location,
				"description":  tt.Description,
				"uid":          tt.UID,
				"professor":    tt.Professor,
				"course_code":  tt.CourseCode,
				"room":         tt.Location,
				"color":        tt.Color,
				"border_color": tt.BorderColor,
			})
		}
	}

	// Custom hours
	var customHours []models.CustomHour
	config.DB.Preload("Room").Where("user_id = ? AND start_time >= ? AND start_time <= ?",
		user.ID, startOfDay, endOfDay).Find(&customHours)

	for _, ch := range customHours {
		var roomStr *string
		if ch.Room != nil {
			roomStr = &ch.Room.RoomNumber
		} else if ch.CustomLocation != nil {
			roomStr = ch.CustomLocation
		}

		events = append(events, map[string]interface{}{
			"event_type":      "custom_hour",
			"title":           ch.Title,
			"start_time":      ch.StartTime.UTC().Format(time.RFC3339),
			"end_time":        ch.EndTime.UTC().Format(time.RFC3339),
			"description":     ch.Description,
			"id":              ch.ID,
			"room":            roomStr,
			"custom_location": ch.CustomLocation,
			"location":        roomStr,
		})
	}

	// Sort by start_time
	// Note: In production, use a proper sorting function
	return c.JSON(events)
}

// GetExams returns all upcoming exams for the user
// GET /v1/exams?session_id=...
func GetExams(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	var exams []models.Exam
	config.DB.Preload("Course").Preload("Room").
		Where("user_id = ? AND start_time >= ?", user.ID, time.Now().UTC()).
		Order("start_time").Find(&exams)

	response := make([]ExamResponse, len(exams))
	for i, exam := range exams {
		var roomStr *string
		if exam.Room != nil {
			roomStr = &exam.Room.RoomNumber
		}

		response[i] = ExamResponse{
			ID:           exam.ID,
			CourseName:   exam.Course.Name,
			ModuleNumber: exam.Course.ModuleNumber,
			StartTime:    exam.StartTime.UTC(),
			Duration:     exam.Duration,
			IsVerified:   exam.IsVerified,
			Room:         roomStr,
		}
	}

	return c.JSON(response)
}

// GetFriends returns user's friend list
// GET /v1/friends?session_id=...
func GetFriends(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	var friendships []models.Friend
	config.DB.Where("user_id1 = ? OR user_id2 = ?", user.ID, user.ID).Find(&friendships)

	friends := make([]FriendResponse, 0)

	for _, friendship := range friendships {
		friendID := friendship.UserID2
		if friendship.UserID1 != user.ID {
			friendID = friendship.UserID1
		}

		var friend models.User
		if err := config.DB.Preload("Zenturie").First(&friend, friendID).Error; err != nil {
			continue
		}

		var zenturieName *string
		if friend.Zenturie != nil {
			zenturieName = &friend.Zenturie.Name
		}

		friends = append(friends, FriendResponse{
			UserID:    friend.ID,
			Zenturie:  zenturieName,
			FirstName: friend.FirstName,
			LastName:  friend.LastName,
			Initials:  friend.Initials,
		})
	}

	return c.JSON(friends)
}

// AddFriend adds a friend to user's friend list
// POST /v1/friends?session_id=...
func AddFriend(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	var req FriendAddRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid request body",
		})
	}

	// Find friend by email
	var friend models.User
	if err := config.DB.Where("mail = ?", req.FriendMail).First(&friend).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "Benutzer nicht gefunden",
		})
	}

	// Check if trying to add self
	if friend.ID == user.ID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Sie können sich nicht selbst als Freund hinzufügen",
		})
	}

	// Check if friendship already exists
	var existingFriendship models.Friend
	result := config.DB.Where(
		"(user_id1 = ? AND user_id2 = ?) OR (user_id1 = ? AND user_id2 = ?)",
		user.ID, friend.ID, friend.ID, user.ID,
	).First(&existingFriendship)

	if result.Error == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Dieser Benutzer ist bereits in Ihrer Freundesliste",
		})
	}

	// Create friendship
	friendship := models.Friend{
		UserID1: user.ID,
		UserID2: friend.ID,
	}

	if err := config.DB.Create(&friendship).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to add friend",
		})
	}

	return c.JSON(MessageResponse{
		Message: friend.FirstName + " " + friend.LastName + " wurde erfolgreich als Freund hinzugefügt",
	})
}

// RemoveFriend removes a friend from user's friend list
// DELETE /v1/friends?session_id=...&friend_user_id=123
func RemoveFriend(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	friendUserID := c.QueryInt("friend_user_id", 0)
	if friendUserID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "friend_user_id parameter required",
		})
	}

	// Find friend
	var friend models.User
	if err := config.DB.First(&friend, friendUserID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "Benutzer nicht gefunden",
		})
	}

	// Find and delete friendship
	var friendship models.Friend
	result := config.DB.Where(
		"(user_id1 = ? AND user_id2 = ?) OR (user_id1 = ? AND user_id2 = ?)",
		user.ID, friendUserID, friendUserID, user.ID,
	).First(&friendship)

	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "Dieser Benutzer ist nicht in Ihrer Freundesliste",
		})
	}

	config.DB.Delete(&friendship)

	return c.JSON(MessageResponse{
		Message: friend.FirstName + " " + friend.LastName + " wurde erfolgreich aus der Freundesliste entfernt",
	})
}

// ViewZenturieTimetable returns timetable for a specific zenturie (public, no auth)
// GET /v1/view?zenturie=I24c&date=2025-01-20
func ViewZenturieTimetable(c *fiber.Ctx) error {
	zenturieName := c.Query("zenturie")
	dateStr := c.Query("date")

	if zenturieName == "" || dateStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "zenturie and date parameters required",
		})
	}

	// Parse date in UTC
	eventDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Ungültiges Datumsformat. Nutze YYYY-MM-DD",
		})
	}

	// Find zenturie
	var zenturie models.Zenturie
	if err := config.DB.Where("name = ?", zenturieName).First(&zenturie).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "Zenturie nicht gefunden",
		})
	}

	// Time range in UTC
	startOfDay := time.Date(eventDate.Year(), eventDate.Month(), eventDate.Day(), 0, 0, 0, 0, time.UTC)
	endOfDay := time.Date(eventDate.Year(), eventDate.Month(), eventDate.Day(), 23, 59, 59, 999999999, time.UTC)

	// Get timetables
	var timetables []models.Timetable
	config.DB.Where("zenturien_id = ? AND start_time >= ? AND start_time <= ?",
		zenturie.ID, startOfDay, endOfDay).Find(&timetables)

	events := make([]map[string]interface{}, 0)
	for _, tt := range timetables {
		events = append(events, map[string]interface{}{
			"event_type":   "timetable",
			"title":        tt.Summary,
			"start_time":   tt.StartTime.UTC().Format(time.RFC3339),
			"end_time":     tt.EndTime.UTC().Format(time.RFC3339),
			"location":     tt.Location,
			"description":  tt.Description,
			"uid":          tt.UID,
			"professor":    tt.Professor,
			"course_code":  tt.CourseCode,
			"room":         tt.Location,
			"color":        tt.Color,
			"border_color": tt.BorderColor,
		})
	}

	return c.JSON(events)
}

// CreateCustomHour creates a new custom hour
// POST /v1/create?session_id=...
func CreateCustomHour(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	var req CustomHourCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid request body",
		})
	}

	// Validate: Either room OR custom_location, not both
	if (req.Room == nil && req.CustomLocation == nil) || (req.Room != nil && req.CustomLocation != nil) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Entweder 'room' ODER 'custom_location' angeben, nicht beides",
		})
	}

	customHour := models.CustomHour{
		UserID:         user.ID,
		Title:          req.Title,
		Description:    req.Description,
		StartTime:      req.StartTime,
		EndTime:        req.EndTime,
		CustomLocation: req.CustomLocation,
	}

	// If room is specified, find it
	if req.Room != nil {
		var room models.Room
		if err := config.DB.Where("room_number = ?", *req.Room).First(&room).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"detail": "Raum nicht gefunden",
			})
		}
		customHour.RoomID = &room.ID
	}

	if err := config.DB.Create(&customHour).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to create custom hour",
		})
	}

	return c.JSON(MessageResponse{
		Message: "Custom Hour erfolgreich erstellt",
	})
}

// UpdateCustomHour updates an existing custom hour
// POST /v1/update?session_id=...
func UpdateCustomHour(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	var req CustomHourUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid request body",
		})
	}

	// Find custom hour
	var customHour models.CustomHour
	if err := config.DB.Where("id = ? AND user_id = ?", req.CustomHourID, user.ID).First(&customHour).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "Custom Hour nicht gefunden oder Sie haben keine Berechtigung",
		})
	}

	// Update fields if provided
	if req.Title != nil {
		customHour.Title = *req.Title
	}
	if req.Description != nil {
		customHour.Description = req.Description
	}
	if req.StartTime != nil {
		customHour.StartTime = *req.StartTime
	}
	if req.EndTime != nil {
		customHour.EndTime = *req.EndTime
	}
	if req.CustomLocation != nil {
		customHour.CustomLocation = req.CustomLocation
		customHour.RoomID = nil // Clear room if custom location is set
	}
	if req.Room != nil {
		var room models.Room
		if err := config.DB.Where("room_number = ?", *req.Room).First(&room).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"detail": "Raum nicht gefunden",
			})
		}
		customHour.RoomID = &room.ID
		customHour.CustomLocation = nil // Clear custom location if room is set
	}

	if err := config.DB.Save(&customHour).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to update custom hour",
		})
	}

	return c.JSON(MessageResponse{
		Message: "Custom Hour erfolgreich aktualisiert",
	})
}

// AddExam adds a new exam
// POST /v1/add?session_id=...
func AddExam(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	var req ExamCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid request body",
		})
	}

	// Find course
	var course models.Course
	if err := config.DB.Where("module_number = ?", req.Course).First(&course).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "Kurs nicht gefunden",
		})
	}

	// Check if user already added this exam
	var existingExam models.Exam
	result := config.DB.Where("user_id = ? AND course_id = ? AND start_time = ? AND duration = ?",
		user.ID, course.ID, req.StartTime, req.Duration).First(&existingExam)

	if result.Error == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Sie haben diese Klausur bereits eingetragen",
		})
	}

	exam := models.Exam{
		CourseID:  course.ID,
		UserID:    user.ID,
		StartTime: req.StartTime,
		Duration:  req.Duration,
	}

	// If room specified, find it
	if req.Room != nil {
		var room models.Room
		if err := config.DB.Where("room_number = ?", *req.Room).First(&room).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"detail": "Raum nicht gefunden",
			})
		}
		exam.RoomID = &room.ID
	}

	if err := config.DB.Create(&exam).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to add exam",
		})
	}

	// Check for verification (3+ users)
	var count int64
	config.DB.Model(&models.Exam{}).Where("course_id = ? AND start_time = ? AND duration = ?",
		course.ID, req.StartTime, req.Duration).Count(&count)

	message := "Klausur erfolgreich hinzugefügt"
	if count >= 3 {
		// Mark all matching exams as verified
		config.DB.Model(&models.Exam{}).Where("course_id = ? AND start_time = ? AND duration = ?",
			course.ID, req.StartTime, req.Duration).Update("is_verified", true)
		message = "Klausur hinzugefügt und verifiziert (3+ Bestätigungen)"
	}

	return c.JSON(MessageResponse{
		Message: message,
	})
}

// CalculateSimilarity calculates string similarity (0.0 to 1.0)
func CalculateSimilarity(query, text string) float64 {
	if text == "" || query == "" {
		return 0.0
	}

	queryLower := strings.ToLower(query)
	textLower := strings.ToLower(text)

	// Exact match
	if queryLower == textLower {
		return 1.0
	}

	// Contains query
	if strings.Contains(textLower, queryLower) {
		return 0.9
	}

	// Simple similarity (can be improved with Levenshtein distance)
	return 0.0
}
