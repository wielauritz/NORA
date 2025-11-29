package handlers

import (
	"sort"
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
	Zenturie         *string `json:"zenturie"`
	Year             *string `json:"year"`
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

// GetEvents returns all events for a specific date or date range (timetables + custom hours)
// GET /v1/events?session_id=...&date=2025-01-20
// GET /v1/events?session_id=...&date=2025-01-01&end=2025-12-01
func GetEvents(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	dateStr := c.Query("date")
	if dateStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Date parameter required (YYYY-MM-DD)",
		})
	}

	// Parse start date in UTC
	eventDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Ungültiges Datumsformat. Nutze YYYY-MM-DD",
		})
	}

	// Start of day in UTC
	startOfDay := time.Date(eventDate.Year(), eventDate.Month(), eventDate.Day(), 0, 0, 0, 0, time.UTC)

	// Check if end parameter is provided (for date range queries)
	endStr := c.Query("end")
	var endOfDay time.Time

	if endStr != "" {
		// Parse end date in UTC
		endDate, err := time.Parse("2006-01-02", endStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"detail": "Ungültiges End-Datumsformat. Nutze YYYY-MM-DD",
			})
		}

		// Validate that end date is not before start date
		if endDate.Before(eventDate) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"detail": "End-Datum darf nicht vor Start-Datum liegen",
			})
		}

		// End of end date in UTC
		endOfDay = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, time.UTC)
	} else {
		// No end parameter: use end of start date (single day query - backward compatible)
		endOfDay = time.Date(eventDate.Year(), eventDate.Month(), eventDate.Day(), 23, 59, 59, 999999999, time.UTC)
	}

	events := make([]map[string]interface{}, 0)

	// Timetable events for user's zenturie
	if user.ZenturienID != nil {
		var timetables []models.Timetable
		config.DB.Preload("Room").Where("zenturien_id = ? AND start_time >= ? AND start_time <= ?",
			*user.ZenturienID, startOfDay, endOfDay).Find(&timetables)

		for _, tt := range timetables {
			var roomStr *string
			if tt.Room != nil {
				roomStr = &tt.Room.RoomNumber
			}

			events = append(events, map[string]interface{}{
				"event_type":   "timetable",
				"title":        tt.Summary,
				"start_time":   tt.StartTime.UTC().Format(time.RFC3339),
				"end_time":     tt.EndTime.UTC().Format(time.RFC3339),
				"location":     roomStr,
				"description":  tt.Description,
				"uid":          tt.UID,
				"professor":    tt.Professor,
				"course_code":  tt.CourseCode,
				"room":         roomStr,
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
	sort.Slice(events, func(i, j int) bool {
		startTimeI, _ := time.Parse(time.RFC3339, events[i]["start_time"].(string))
		startTimeJ, _ := time.Parse(time.RFC3339, events[j]["start_time"].(string))
		return startTimeI.Before(startTimeJ)
	})

	return c.JSON(events)
}

// GetExams returns all upcoming exams for the user's entire year (e.g., A24)
// GET /v1/exams?session_id=...
func GetExams(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	// Check if user has a zenturie
	if user.ZenturienID == nil {
		return c.JSON([]ExamResponse{})
	}

	// Get user's zenturie to find the study program + year
	var zenturie models.Zenturie
	if err := config.DB.First(&zenturie, *user.ZenturienID).Error; err != nil {
		return c.JSON([]ExamResponse{})
	}

	// Extract study program + year from zenturie name (e.g., "I24c" -> "I24", "A24a" -> "A24")
	// This is everything except the last character
	zenturieName := zenturie.Name
	if len(zenturieName) < 2 {
		return c.JSON([]ExamResponse{})
	}
	studyProgramAndYear := zenturieName[:len(zenturieName)-1] // Remove last character

	// Find all zenturien with the same study program + year (e.g., all "A24*")
	var zenturienIDs []uint
	config.DB.Model(&models.Zenturie{}).
		Where("name LIKE ?", studyProgramAndYear+"%").
		Pluck("id", &zenturienIDs)

	// Find all users in these zenturien
	var userIDs []uint
	config.DB.Model(&models.User{}).
		Where("zenturien_id IN ?", zenturienIDs).
		Pluck("id", &userIDs)

	// Find all exams from these users
	var exams []models.Exam
	config.DB.Preload("Course").Preload("Room").
		Where("user_id IN ? AND start_time >= ?", userIDs, time.Now().UTC()).
		Order("start_time").
		Find(&exams)

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
			"detail": "Du kannst dich nicht selbst als Freund hinzufügen",
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
// GET /v1/view?zenturie=I24c&date=2025-01-20&end=2025-01-22
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

	// Check if end parameter is provided (for date range queries)
	endStr := c.Query("end")
	var endDate time.Time

	if endStr != "" {
		// Parse end date in UTC
		endDate, err = time.Parse("2006-01-02", endStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"detail": "Ungültiges End-Datumsformat. Nutze YYYY-MM-DD",
			})
		}

		// Validate that end date is not before start date
		if endDate.Before(eventDate) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"detail": "End-Datum darf nicht vor Start-Datum liegen",
			})
		}
	} else {
		// No end parameter: use start date as end date
		endDate = eventDate
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
	endOfDay := time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, time.UTC)

	// Get timetables
	var timetables []models.Timetable
	config.DB.Preload("Room").Where("zenturien_id = ? AND start_time >= ? AND start_time <= ?",
		zenturie.ID, startOfDay, endOfDay).Find(&timetables)

	events := make([]map[string]interface{}, 0)
	for _, tt := range timetables {
		var roomStr *string
		if tt.Room != nil {
			roomStr = &tt.Room.RoomNumber
		}

		events = append(events, map[string]interface{}{
			"event_type":   "timetable",
			"title":        tt.Summary,
			"start_time":   tt.StartTime.UTC().Format(time.RFC3339),
			"end_time":     tt.EndTime.UTC().Format(time.RFC3339),
			"location":     roomStr,
			"description":  tt.Description,
			"uid":          tt.UID,
			"professor":    tt.Professor,
			"course_code":  tt.CourseCode,
			"room":         roomStr,
			"color":        tt.Color,
			"border_color": tt.BorderColor,
		})
	}

	// Sort by start_time
	sort.Slice(events, func(i, j int) bool {
		startTimeI, _ := time.Parse(time.RFC3339, events[i]["start_time"].(string))
		startTimeJ, _ := time.Parse(time.RFC3339, events[j]["start_time"].(string))
		return startTimeI.Before(startTimeJ)
	})

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
			"detail": "Custom Hour nicht gefunden oder du hast keine Berechtigung",
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

	// Check if user has a zenturie
	if user.ZenturienID == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Du musst zuerst eine Zenturie auswählen",
		})
	}

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

	// Get user's zenturie to find the study program + year
	var zenturie models.Zenturie
	if err := config.DB.First(&zenturie, *user.ZenturienID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Zenturie nicht gefunden",
		})
	}

	// Extract study program + year from zenturie name (e.g., "I24c" -> "I24", "A24a" -> "A24")
	// This is everything except the last character
	zenturieName := zenturie.Name
	if len(zenturieName) < 2 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Ungültiger Zenturie-Name",
		})
	}
	studyProgramAndYear := zenturieName[:len(zenturieName)-1] // Remove last character

	// Find all zenturien with the same study program + year (e.g., all "A24*")
	var zenturienIDs []uint
	config.DB.Model(&models.Zenturie{}).
		Where("name LIKE ?", studyProgramAndYear+"%").
		Pluck("id", &zenturienIDs)

	// Find all users in these zenturien
	var userIDs []uint
	config.DB.Model(&models.User{}).
		Where("zenturien_id IN ?", zenturienIDs).
		Pluck("id", &userIDs)

	// Check if this exam already exists for someone in the same year
	var existingExam models.Exam
	result := config.DB.
		Where("user_id IN ? AND course_id = ? AND start_time = ? AND duration = ?",
			userIDs, course.ID, req.StartTime, req.Duration).
		First(&existingExam)

	if result.Error == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Diese Klausur wurde bereits für deinen Studiengang eingetragen",
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

	// Check for verification (3+ different years)
	// Get all exams with same course, time, and duration
	var allMatchingExams []models.Exam
	config.DB.Preload("User.Zenturie").
		Where("course_id = ? AND start_time = ? AND duration = ?",
			course.ID, req.StartTime, req.Duration).
		Find(&allMatchingExams)

	// Count unique years
	uniqueYears := make(map[string]bool)
	for _, e := range allMatchingExams {
		if e.User != nil && e.User.Zenturie != nil {
			uniqueYears[e.User.Zenturie.Year] = true
		}
	}

	message := "Klausur erfolgreich für deinen Studiengang hinzugefügt"
	if len(uniqueYears) >= 3 {
		// Mark all matching exams as verified
		config.DB.Model(&models.Exam{}).Where("course_id = ? AND start_time = ? AND duration = ?",
			course.ID, req.StartTime, req.Duration).Update("is_verified", true)
		message = "Klausur hinzugefügt und verifiziert (3+ Studiengänge haben bestätigt)"
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

	// Contains query (full substring match)
	if strings.Contains(textLower, queryLower) {
		// Score based on how much of the text the query covers
		coverage := float64(len(queryLower)) / float64(len(textLower))
		return 0.85 + (coverage * 0.15) // 0.85 to 1.0
	}

	// Word-based matching: check if any word in text starts with query
	words := strings.Fields(textLower)
	queryWords := strings.Fields(queryLower)

	// Check if any word in text starts with the query
	for _, word := range words {
		if strings.HasPrefix(word, queryLower) {
			return 0.75
		}
	}

	// Check if all query words are present in text
	allWordsPresent := true
	for _, qWord := range queryWords {
		wordFound := false
		for _, tWord := range words {
			if strings.Contains(tWord, qWord) {
				wordFound = true
				break
			}
		}
		if !wordFound {
			allWordsPresent = false
			break
		}
	}
	if allWordsPresent && len(queryWords) > 0 {
		return 0.65
	}

	// Partial word matches: check if query appears within any word
	for _, word := range words {
		if strings.Contains(word, queryLower) {
			return 0.55
		}
	}

	// Character-based fuzzy matching for potential typos
	// Calculate Levenshtein distance ratio
	distance := levenshteinDistance(queryLower, textLower)
	maxLen := max(len(queryLower), len(textLower))
	if maxLen > 0 {
		similarity := 1.0 - (float64(distance) / float64(maxLen))
		// Only return if similarity is meaningful (> 0.4)
		if similarity > 0.4 {
			return similarity * 0.5 // Scale down to max 0.5 for fuzzy matches
		}
	}

	// Check for common subsequence
	lcs := longestCommonSubsequence(queryLower, textLower)
	if lcs > 3 { // At least 4 characters in common
		score := float64(lcs) / float64(len(queryLower))
		if score > 0.5 {
			return score * 0.4 // Scale down to max 0.4
		}
	}

	return 0.0
}

// levenshteinDistance calculates the Levenshtein distance between two strings
func levenshteinDistance(s1, s2 string) int {
	if len(s1) == 0 {
		return len(s2)
	}
	if len(s2) == 0 {
		return len(s1)
	}

	// Create matrix
	matrix := make([][]int, len(s1)+1)
	for i := range matrix {
		matrix[i] = make([]int, len(s2)+1)
		matrix[i][0] = i
	}
	for j := range matrix[0] {
		matrix[0][j] = j
	}

	// Fill matrix
	for i := 1; i <= len(s1); i++ {
		for j := 1; j <= len(s2); j++ {
			cost := 0
			if s1[i-1] != s2[j-1] {
				cost = 1
			}
			matrix[i][j] = min(
				matrix[i-1][j]+1,      // deletion
				matrix[i][j-1]+1,      // insertion
				matrix[i-1][j-1]+cost, // substitution
			)
		}
	}

	return matrix[len(s1)][len(s2)]
}

// longestCommonSubsequence calculates the length of the longest common subsequence
func longestCommonSubsequence(s1, s2 string) int {
	m, n := len(s1), len(s2)
	if m == 0 || n == 0 {
		return 0
	}

	// Create DP table
	dp := make([][]int, m+1)
	for i := range dp {
		dp[i] = make([]int, n+1)
	}

	// Fill DP table
	for i := 1; i <= m; i++ {
		for j := 1; j <= n; j++ {
			if s1[i-1] == s2[j-1] {
				dp[i][j] = dp[i-1][j-1] + 1
			} else {
				dp[i][j] = max(dp[i-1][j], dp[i][j-1])
			}
		}
	}

	return dp[m][n]
}

// Helper functions for min/max
func min(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
