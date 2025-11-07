package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/nora-nak/backend/config"
	"github.com/nora-nak/backend/middleware"
	"github.com/nora-nak/backend/models"
	"gorm.io/gorm"
)

// V2 Request/Response Types

type FriendRequestSendRequest struct {
	FriendMail string `json:"friend_mail"`
}

type FriendRequestActionRequest struct {
	RequestID uint `json:"request_id"`
}

type FriendRequestResponse struct {
	ID          uint      `json:"id"`
	RequesterID uint      `json:"requester_id"`
	ReceiverID  uint      `json:"receiver_id"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	// User info
	UserID    uint    `json:"user_id"`    // The other user's ID
	FirstName string  `json:"first_name"` // The other user's first name
	LastName  string  `json:"last_name"`  // The other user's last name
	Initials  string  `json:"initials"`   // The other user's initials
	Zenturie  *string `json:"zenturie"`   // The other user's zenturie
}

type FriendRequestsResponse struct {
	Incoming []FriendRequestResponse `json:"incoming"` // Requests received by current user
	Outgoing []FriendRequestResponse `json:"outgoing"` // Requests sent by current user
}

type AcceptedFriendResponse struct {
	UserID    uint    `json:"user_id"`
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	Initials  string  `json:"initials"`
	Zenturie  *string `json:"zenturie"`
}

// SendFriendRequest sends a friend request
// POST /v2/friends/request
func SendFriendRequest(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	var req FriendRequestSendRequest
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

	// Check if request already exists (in either direction)
	var existingRequest models.FriendRequest
	result := config.DB.Where(
		"((requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)) AND status IN ('pending', 'accepted')",
		user.ID, friend.ID, friend.ID, user.ID,
	).First(&existingRequest)

	if result.Error == nil {
		if existingRequest.Status == "accepted" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"detail": "Du bist bereits mit diesem Benutzer befreundet",
			})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Es existiert bereits eine ausstehende Anfrage mit diesem Benutzer",
		})
	}

	// Create friend request
	friendRequest := models.FriendRequest{
		RequesterID: user.ID,
		ReceiverID:  friend.ID,
		Status:      "pending",
	}

	if err := config.DB.Create(&friendRequest).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to send friend request",
		})
	}

	return c.JSON(MessageResponse{
		Message: "Freundschaftsanfrage an " + friend.FirstName + " " + friend.LastName + " wurde gesendet",
	})
}

// GetFriendRequests retrieves all friend requests (incoming and outgoing)
// GET /v2/friends/requests
func GetFriendRequests(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	var incomingRequests []models.FriendRequest
	var outgoingRequests []models.FriendRequest

	// Get incoming requests (where current user is receiver)
	config.DB.Preload("Requester").Preload("Requester.Zenturie").
		Where("receiver_id = ? AND status = 'pending'", user.ID).
		Find(&incomingRequests)

	// Get outgoing requests (where current user is requester)
	config.DB.Preload("Receiver").Preload("Receiver.Zenturie").
		Where("requester_id = ? AND status = 'pending'", user.ID).
		Find(&outgoingRequests)

	incoming := make([]FriendRequestResponse, 0)
	for _, req := range incomingRequests {
		var zenturieName *string
		if req.Requester != nil && req.Requester.Zenturie != nil {
			zenturieName = &req.Requester.Zenturie.Name
		}

		incoming = append(incoming, FriendRequestResponse{
			ID:          req.ID,
			RequesterID: req.RequesterID,
			ReceiverID:  req.ReceiverID,
			Status:      req.Status,
			CreatedAt:   req.CreatedAt,
			UpdatedAt:   req.UpdatedAt,
			UserID:      req.Requester.ID,
			FirstName:   req.Requester.FirstName,
			LastName:    req.Requester.LastName,
			Initials:    req.Requester.Initials,
			Zenturie:    zenturieName,
		})
	}

	outgoing := make([]FriendRequestResponse, 0)
	for _, req := range outgoingRequests {
		var zenturieName *string
		if req.Receiver != nil && req.Receiver.Zenturie != nil {
			zenturieName = &req.Receiver.Zenturie.Name
		}

		outgoing = append(outgoing, FriendRequestResponse{
			ID:          req.ID,
			RequesterID: req.RequesterID,
			ReceiverID:  req.ReceiverID,
			Status:      req.Status,
			CreatedAt:   req.CreatedAt,
			UpdatedAt:   req.UpdatedAt,
			UserID:      req.Receiver.ID,
			FirstName:   req.Receiver.FirstName,
			LastName:    req.Receiver.LastName,
			Initials:    req.Receiver.Initials,
			Zenturie:    zenturieName,
		})
	}

	return c.JSON(FriendRequestsResponse{
		Incoming: incoming,
		Outgoing: outgoing,
	})
}

// AcceptFriendRequest accepts a friend request
// POST /v2/friends/accept
func AcceptFriendRequest(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	var req FriendRequestActionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid request body",
		})
	}

	// Find the friend request
	var friendRequest models.FriendRequest
	if err := config.DB.Preload("Requester").First(&friendRequest, req.RequestID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "Freundschaftsanfrage nicht gefunden",
		})
	}

	// Verify that the current user is the receiver
	if friendRequest.ReceiverID != user.ID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"detail": "Du kannst nur Anfragen annehmen, die an dich gerichtet sind",
		})
	}

	// Check if already accepted
	if friendRequest.Status == "accepted" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Diese Anfrage wurde bereits akzeptiert",
		})
	}

	// Check if rejected
	if friendRequest.Status == "rejected" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Diese Anfrage wurde bereits abgelehnt",
		})
	}

	// Update status to accepted
	friendRequest.Status = "accepted"
	if err := config.DB.Save(&friendRequest).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to accept friend request",
		})
	}

	requesterName := ""
	if friendRequest.Requester != nil {
		requesterName = friendRequest.Requester.FirstName + " " + friendRequest.Requester.LastName
	}

	return c.JSON(MessageResponse{
		Message: "Du bist nun mit " + requesterName + " befreundet",
	})
}

// RejectFriendRequest rejects a friend request
// POST /v2/friends/reject
func RejectFriendRequest(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	var req FriendRequestActionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Invalid request body",
		})
	}

	// Find the friend request
	var friendRequest models.FriendRequest
	if err := config.DB.First(&friendRequest, req.RequestID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "Freundschaftsanfrage nicht gefunden",
		})
	}

	// Verify that the current user is the receiver
	if friendRequest.ReceiverID != user.ID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"detail": "Du kannst nur Anfragen ablehnen, die an dich gerichtet sind",
		})
	}

	// Check if already accepted
	if friendRequest.Status == "accepted" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Diese Anfrage wurde bereits akzeptiert und kann nicht mehr abgelehnt werden",
		})
	}

	// Update status to rejected
	friendRequest.Status = "rejected"
	if err := config.DB.Save(&friendRequest).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to reject friend request",
		})
	}

	return c.JSON(MessageResponse{
		Message: "Freundschaftsanfrage wurde abgelehnt",
	})
}

// CancelFriendRequest cancels an outgoing friend request
// DELETE /v2/friends/request?request_id=123
func CancelFriendRequest(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	requestID := c.QueryInt("request_id", 0)
	if requestID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "request_id parameter required",
		})
	}

	// Find the friend request
	var friendRequest models.FriendRequest
	if err := config.DB.First(&friendRequest, requestID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "Freundschaftsanfrage nicht gefunden",
		})
	}

	// Verify that the current user is the requester
	if friendRequest.RequesterID != user.ID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"detail": "Du kannst nur Anfragen zurückziehen, die du selbst gesendet hast",
		})
	}

	// Only pending requests can be cancelled
	if friendRequest.Status != "pending" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "Nur ausstehende Anfragen können zurückgezogen werden",
		})
	}

	// Delete the request
	if err := config.DB.Delete(&friendRequest).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to cancel friend request",
		})
	}

	return c.JSON(MessageResponse{
		Message: "Freundschaftsanfrage wurde zurückgezogen",
	})
}

// GetFriendsV2 retrieves all accepted friends (v2)
// GET /v2/friends
func GetFriendsV2(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	var friendRequests []models.FriendRequest

	// Get all accepted friend requests where user is either requester or receiver
	config.DB.Preload("Requester").Preload("Requester.Zenturie").
		Preload("Receiver").Preload("Receiver.Zenturie").
		Where("(requester_id = ? OR receiver_id = ?) AND status = 'accepted'", user.ID, user.ID).
		Find(&friendRequests)

	friends := make([]AcceptedFriendResponse, 0)

	for _, req := range friendRequests {
		// Determine which user is the friend (not the current user)
		var friendUser *models.User
		if req.RequesterID == user.ID {
			friendUser = req.Receiver
		} else {
			friendUser = req.Requester
		}

		if friendUser == nil {
			continue
		}

		var zenturieName *string
		if friendUser.Zenturie != nil {
			zenturieName = &friendUser.Zenturie.Name
		}

		friends = append(friends, AcceptedFriendResponse{
			UserID:    friendUser.ID,
			FirstName: friendUser.FirstName,
			LastName:  friendUser.LastName,
			Initials:  friendUser.Initials,
			Zenturie:  zenturieName,
		})
	}

	return c.JSON(friends)
}

// RemoveFriendV2 removes a friendship (v2)
// DELETE /v2/friends?friend_user_id=123
func RemoveFriendV2(c *fiber.Ctx) error {
	user := middleware.GetCurrentUser(c)

	friendUserID := c.QueryInt("friend_user_id", 0)
	if friendUserID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"detail": "friend_user_id parameter required",
		})
	}

	// Find the accepted friendship
	var friendRequest models.FriendRequest
	result := config.DB.Where(
		"((requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)) AND status = 'accepted'",
		user.ID, friendUserID, friendUserID, user.ID,
	).First(&friendRequest)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"detail": "Dieser Benutzer ist nicht in Ihrer Freundesliste",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to find friendship",
		})
	}

	// Delete the friendship
	if err := config.DB.Delete(&friendRequest).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"detail": "Failed to remove friend",
		})
	}

	return c.JSON(MessageResponse{
		Message: "Freund wurde erfolgreich entfernt",
	})
}
