package handlers

import (
	"sort"

	"github.com/gofiber/fiber/v2"
	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/middleware"
	"github.com/nora-nak/backend/models"
)

// SearchResult represents a single search result
type SearchResult struct {
	ResultType string  `json:"result_type"`
	ID         uint    `json:"id"`
	Name       string  `json:"name"`
	Details    *string `json:"details,omitempty"`
	StartTime  *string `json:"start_time,omitempty"`
	Location   *string `json:"location,omitempty"`
	Score      float64 `json:"-"` // Internal use only
}

// GroupedSearchResponse represents grouped search results
type GroupedSearchResponse struct {
	Timetables  []SearchResult `json:"timetables"`
	CustomHours []SearchResult `json:"custom_hours"`
	Exams       []SearchResult `json:"exams"`
	Rooms       []SearchResult `json:"rooms"`
	Friends     []SearchResult `json:"friends"`
}

// Search performs a comprehensive search across all entities
// GET /v1/search?session_id=...&parameter=Algorithmen
func Search(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	query := c.Query("parameter")
	if query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "parameter query string required",
		})
	}

	minScore := 0.3 // Lowered from 0.6 for better results

	timetableResults := make([]SearchResult, 0)
	customHourResults := make([]SearchResult, 0)
	examResults := make([]SearchResult, 0)
	roomResults := make([]SearchResult, 0)
	friendResults := make([]SearchResult, 0)

	// 1. Search in Timetables (user's zenturie)
	if user.ZenturienID != nil {
		var timetables []models.Timetable
		config.DB.Where("zenturien_id = ?", *user.ZenturienID).Find(&timetables)

		for _, tt := range timetables {
			score := getBestMatchScore(query,
				tt.Summary,
				strPtr(tt.Description),
				strPtr(tt.Professor),
				strPtr(tt.CourseCode),
				strPtr(tt.Location),
			)

			if score >= minScore {
				details := ""
				if tt.Professor != nil {
					details = "Professor: " + *tt.Professor
				}

				startTime := tt.StartTime.Format("2006-01-02T15:04:05")
				location := ""
				if tt.Location != nil {
					location = *tt.Location
				}

				timetableResults = append(timetableResults, SearchResult{
					ResultType: "event",
					ID:         tt.ID,
					Name:       tt.Summary,
					Details:    &details,
					StartTime:  &startTime,
					Location:   &location,
					Score:      score,
				})
			}
		}
	}

	// 2. Search in Custom Hours
	var customHours []models.CustomHour
	config.DB.Preload("Room").Where("user_id = ?", user.ID).Find(&customHours)

	for _, ch := range customHours {
		roomStr := ""
		if ch.Room != nil {
			roomStr = ch.Room.RoomNumber
		} else if ch.CustomLocation != nil {
			roomStr = *ch.CustomLocation
		}

		score := getBestMatchScore(query,
			ch.Title,
			strPtr(ch.Description),
			&roomStr,
		)

		if score >= minScore {
			startTime := ch.StartTime.Format("2006-01-02T15:04:05")

			customHourResults = append(customHourResults, SearchResult{
				ResultType: "custom_hour",
				ID:         ch.ID,
				Name:       ch.Title,
				Details:    ch.Description,
				StartTime:  &startTime,
				Location:   &roomStr,
				Score:      score,
			})
		}
	}

	// 3. Search in Exams
	var exams []models.Exam
	config.DB.Preload("Course").Preload("Room").Where("user_id = ?", user.ID).Find(&exams)

	for _, exam := range exams {
		roomStr := ""
		if exam.Room != nil {
			roomStr = exam.Room.RoomNumber
		}

		score := getBestMatchScore(query,
			exam.Course.Name,
			exam.Course.ModuleNumber,
			&roomStr,
		)

		if score >= minScore {
			details := exam.Course.ModuleNumber + " - " + string(rune(exam.Duration)) + " Minuten"
			startTime := exam.StartTime.Format("2006-01-02T15:04:05")

			examResults = append(examResults, SearchResult{
				ResultType: "exam",
				ID:         exam.ID,
				Name:       exam.Course.Name,
				Details:    &details,
				StartTime:  &startTime,
				Location:   nil,
				Score:      score,
			})
		}
	}

	// 4. Search in Rooms
	var rooms []models.Room
	config.DB.Find(&rooms)

	for _, room := range rooms {
		roomNameStr := ""
		if room.RoomName != nil {
			roomNameStr = *room.RoomName
		}

		score := getBestMatchScore(query,
			room.RoomNumber,
			&roomNameStr,
			room.Building,
			"Etage "+room.Floor,
		)

		if score >= minScore {
			details := roomNameStr
			if details == "" {
				details = "Gebäude " + room.Building + ", Etage " + room.Floor
			}

			location := "Gebäude " + room.Building + ", Etage " + room.Floor

			roomResults = append(roomResults, SearchResult{
				ResultType: "room",
				ID:         room.ID,
				Name:       room.RoomNumber,
				Details:    &details,
				StartTime:  nil,
				Location:   &location,
				Score:      score,
			})
		}
	}

	// 5. Search in Friends
	var friendships []models.Friend
	config.DB.Where("user_id1 = ? OR user_id2 = ?", user.ID, user.ID).Find(&friendships)

	var friendIDs []uint
	for _, f := range friendships {
		if f.UserID1 == user.ID {
			friendIDs = append(friendIDs, f.UserID2)
		} else {
			friendIDs = append(friendIDs, f.UserID1)
		}
	}

	if len(friendIDs) > 0 {
		var friends []models.User
		config.DB.Preload("Zenturie").Where("id IN ?", friendIDs).Find(&friends)

		for _, friend := range friends {
			zenturieName := ""
			if friend.Zenturie != nil {
				zenturieName = friend.Zenturie.Name
			}

			score := getBestMatchScore(query,
				friend.FirstName,
				friend.LastName,
				friend.Initials,
				&zenturieName,
				friend.Mail,
			)

			if score >= minScore {
				details := "Zenturie: " + zenturieName

				friendResults = append(friendResults, SearchResult{
					ResultType: "friend",
					ID:         friend.ID,
					Name:       friend.FirstName + " " + friend.LastName,
					Details:    &details,
					StartTime:  nil,
					Location:   nil,
					Score:      score,
				})
			}
		}
	}

	// Sort each category by score (highest first)
	sortByScore := func(results []SearchResult) {
		sort.Slice(results, func(i, j int) bool {
			return results[i].Score > results[j].Score
		})
	}

	sortByScore(timetableResults)
	sortByScore(customHourResults)
	sortByScore(examResults)
	sortByScore(roomResults)
	sortByScore(friendResults)

	// Limit to top 20 per category
	if len(timetableResults) > 20 {
		timetableResults = timetableResults[:20]
	}
	if len(customHourResults) > 20 {
		customHourResults = customHourResults[:20]
	}
	if len(examResults) > 20 {
		examResults = examResults[:20]
	}
	if len(roomResults) > 20 {
		roomResults = roomResults[:20]
	}
	if len(friendResults) > 20 {
		friendResults = friendResults[:20]
	}

	return c.JSON(GroupedSearchResponse{
		Timetables:  timetableResults,
		CustomHours: customHourResults,
		Exams:       examResults,
		Rooms:       roomResults,
		Friends:     friendResults,
	})
}

// getBestMatchScore returns the highest similarity score from multiple fields
func getBestMatchScore(query string, fields ...interface{}) float64 {
	maxScore := 0.0

	for _, field := range fields {
		if field == nil {
			continue
		}

		var text string
		switch v := field.(type) {
		case string:
			text = v
		case *string:
			if v != nil {
				text = *v
			}
		default:
			continue
		}

		score := CalculateSimilarity(query, text)
		if score > maxScore {
			maxScore = score
		}
	}

	return maxScore
}

// strPtr helper to convert *string to string
func strPtr(s *string) *string {
	return s
}
