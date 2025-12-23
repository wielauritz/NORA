package models

import (
	"time"

	"gorm.io/gorm"
)

// Tenant represents a school/institution with its own Keycloak realm
type Tenant struct {
	ID               uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Name             string    `gorm:"not null;size:255" json:"name"`               // "Nordakademie Hamburg"
	Slug             string    `gorm:"uniqueIndex;not null;size:100" json:"slug"`   // "nordakademie-hh"
	KeycloakRealmID  string    `gorm:"not null;size:255" json:"keycloak_realm_id"`  // "nordakademie-hh-realm"
	KeycloakURL      string    `gorm:"not null;size:500" json:"keycloak_url"`       // "https://keycloak.nora-nak.de"
	KeycloakClientID string    `gorm:"not null;size:255" json:"keycloak_client_id"` // "nora-backend"
	IsActive         bool      `gorm:"default:true;not null" json:"is_active"`
	CreatedAt        time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt        time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Relationships
	Users      []User      `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE" json:"-"`
	Zenturien  []Zenturie  `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE" json:"-"`
	Courses    []Course    `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE" json:"-"`
	Rooms      []Room      `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE" json:"-"`
	Timetables []Timetable `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE" json:"-"`
}

// Zenturie represents a class/cohort (e.g., I24c, A24b)
type Zenturie struct {
	ID       uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	TenantID uint   `gorm:"index;not null;uniqueIndex:idx_tenant_zenturie_name" json:"tenant_id"`
	Name     string `gorm:"not null;uniqueIndex:idx_tenant_zenturie_name" json:"name"`
	Year     string `gorm:"not null" json:"year"`

	// Relationships
	Tenant     *Tenant     `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE" json:"tenant,omitempty"`
	Users      []User      `gorm:"foreignKey:ZenturienID" json:"-"`
	Timetables []Timetable `gorm:"foreignKey:ZenturienID" json:"-"`
}

// User represents a user authenticated via Keycloak
type User struct {
	ID               uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	TenantID         uint      `gorm:"index;not null;uniqueIndex:idx_tenant_keycloak_user;uniqueIndex:idx_tenant_email" json:"tenant_id"`
	KeycloakUserID   string    `gorm:"size:255;not null;uniqueIndex:idx_tenant_keycloak_user" json:"keycloak_user_id"` // Keycloak 'sub' claim
	Email            string    `gorm:"size:255;not null;uniqueIndex:idx_tenant_email" json:"email"`
	FirstName        string    `gorm:"size:255;not null" json:"first_name"`
	LastName         string    `gorm:"size:255;not null" json:"last_name"`
	Initials         string    `gorm:"size:2;not null" json:"initials"`
	ZenturienID      *uint     `gorm:"index" json:"zenturie_id,omitempty"`
	SubscriptionUUID *string   `gorm:"size:255;uniqueIndex:idx_tenant_subscription" json:"subscription_uuid,omitempty"`
	CreatedAt        time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt        time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Relationships
	Tenant      *Tenant      `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE" json:"tenant,omitempty"`
	Zenturie    *Zenturie    `gorm:"foreignKey:ZenturienID;constraint:OnDelete:SET NULL" json:"zenturie,omitempty"`
	CustomHours []CustomHour `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Exams       []Exam       `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

// Course represents a course/module
type Course struct {
	ID           uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	TenantID     uint   `gorm:"index;not null;uniqueIndex:idx_tenant_module_number" json:"tenant_id"`
	Name         string `gorm:"not null" json:"name"`
	ModuleNumber string `gorm:"not null;uniqueIndex:idx_tenant_module_number" json:"module_number"`
	Year         string `gorm:"not null" json:"year"`

	// Relationships
	Tenant     *Tenant     `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE" json:"tenant,omitempty"`
	Timetables []Timetable `gorm:"foreignKey:CourseID" json:"-"`
	Exams      []Exam      `gorm:"foreignKey:CourseID" json:"-"`
}

// Room represents a university room
type Room struct {
	ID         uint    `gorm:"primaryKey;autoIncrement" json:"id"`
	TenantID   uint    `gorm:"index;not null;uniqueIndex:idx_tenant_room_number" json:"tenant_id"`
	RoomNumber string  `gorm:"not null;uniqueIndex:idx_tenant_room_number" json:"room_number"`
	Building   string  `gorm:"not null" json:"building"`
	Floor      string  `gorm:"not null" json:"floor"`
	RoomName   *string `json:"room_name,omitempty"`

	// Relationships
	Tenant      *Tenant      `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE" json:"tenant,omitempty"`
	Timetables  []Timetable  `gorm:"foreignKey:RoomID" json:"-"`
	CustomHours []CustomHour `gorm:"foreignKey:RoomID" json:"-"`
	Exams       []Exam       `gorm:"foreignKey:RoomID" json:"-"`
}

// Timetable represents a timetable entry
type Timetable struct {
	ID          uint  `gorm:"primaryKey;autoIncrement" json:"id"`
	TenantID    uint  `gorm:"index;not null;uniqueIndex:idx_tenant_uid_zenturie" json:"tenant_id"`
	ZenturienID uint  `gorm:"index;not null;uniqueIndex:idx_tenant_uid_zenturie" json:"zenturien_id"`
	CourseID    *uint `gorm:"index" json:"course_id,omitempty"`
	RoomID      *uint `gorm:"index" json:"room_id,omitempty"`

	// ICS/JSON Import Fields
	UID         string    `gorm:"not null;uniqueIndex:idx_tenant_uid_zenturie" json:"uid"`
	Summary     string    `gorm:"not null" json:"summary"`
	Description *string   `gorm:"type:text" json:"description,omitempty"`
	Location    *string   `json:"location,omitempty"`
	StartTime   time.Time `gorm:"index;not null" json:"start_time"`
	EndTime     time.Time `gorm:"not null" json:"end_time"`

	// Extracted/Additional Fields
	Professor  *string `json:"professor,omitempty"`
	CourseType *string `json:"course_type,omitempty"`

	// ICS Metadata
	DTStamp    *string `json:"dtstamp,omitempty"`
	Priority   *string `json:"priority,omitempty"`
	Categories *string `json:"categories,omitempty"`
	CourseCode *string `json:"course_code,omitempty"`

	// Frontend Display
	Color       *string `json:"color,omitempty"`
	BorderColor *string `json:"border_color,omitempty"`

	// Relationships
	Tenant   *Tenant   `gorm:"foreignKey:TenantID;constraint:OnDelete:CASCADE" json:"tenant,omitempty"`
	Zenturie *Zenturie `gorm:"foreignKey:ZenturienID;constraint:OnDelete:CASCADE" json:"zenturie,omitempty"`
	Course   *Course   `gorm:"foreignKey:CourseID;constraint:OnDelete:SET NULL" json:"course,omitempty"`
	Room     *Room     `gorm:"foreignKey:RoomID;constraint:OnDelete:SET NULL" json:"room,omitempty"`
}

// CustomHour represents a user-defined appointment
type CustomHour struct {
	ID             uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID         uint      `gorm:"index;not null" json:"user_id"`
	Title          string    `gorm:"not null" json:"title"`
	Description    *string   `gorm:"type:text" json:"description,omitempty"`
	StartTime      time.Time `gorm:"index;not null" json:"start_time"`
	EndTime        time.Time `gorm:"not null" json:"end_time"`
	RoomID         *uint     `gorm:"index" json:"room_id,omitempty"`
	CustomLocation *string   `json:"custom_location,omitempty"`

	// Relationships
	User *User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	Room *Room `gorm:"foreignKey:RoomID;constraint:OnDelete:SET NULL" json:"room,omitempty"`
}

// Exam represents an exam
type Exam struct {
	ID         uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	CourseID   uint      `gorm:"index;not null" json:"course_id"`
	UserID     uint      `gorm:"index;not null" json:"user_id"`
	StartTime  time.Time `gorm:"index;not null" json:"start_time"`
	Duration   int       `gorm:"not null;check:duration IN (30, 45, 60, 90, 120)" json:"duration"`
	IsVerified bool      `gorm:"default:false" json:"is_verified"`
	RoomID     *uint     `gorm:"index" json:"room_id,omitempty"`

	// Relationships
	Course *Course `gorm:"foreignKey:CourseID;constraint:OnDelete:CASCADE" json:"course,omitempty"`
	User   *User   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	Room   *Room   `gorm:"foreignKey:RoomID;constraint:OnDelete:SET NULL" json:"room,omitempty"`
}

// Friend represents a friendship relationship (v1 API - deprecated, kept for backwards compatibility)
type Friend struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID1   uint      `gorm:"index;not null" json:"user_id1"`
	UserID2   uint      `gorm:"index;not null" json:"user_id2"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

// Ensure unique friendship constraint
func (Friend) TableName() string {
	return "friends"
}

// BeforeCreate hook for Friend to ensure unique constraint
func (f *Friend) BeforeCreate(tx *gorm.DB) error {
	return nil
}

// FriendRequest represents a bidirectional friend request (v2 API)
type FriendRequest struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	RequesterID uint      `gorm:"index;not null" json:"requester_id"`                              // User who sends the request
	ReceiverID  uint      `gorm:"index;not null" json:"receiver_id"`                               // User who receives the request
	Status      string    `gorm:"type:varchar(20);not null;default:'pending';index" json:"status"` // pending, accepted, rejected
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Relationships
	Requester *User `gorm:"foreignKey:RequesterID;constraint:OnDelete:CASCADE" json:"requester,omitempty"`
	Receiver  *User `gorm:"foreignKey:ReceiverID;constraint:OnDelete:CASCADE" json:"receiver,omitempty"`
}

// TableName specifies the table name
func (FriendRequest) TableName() string {
	return "friend_requests"
}

// UserSettings represents user-specific settings
type UserSettings struct {
	ID                     uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID                 uint      `gorm:"uniqueIndex;not null" json:"user_id"`
	Theme                  string    `gorm:"type:varchar(20);not null;default:'auto';check:theme IN ('auto', 'hell', 'dunkel')" json:"theme"`
	NotificationPreference string    `gorm:"type:varchar(20);not null;default:'beide';check:notification_preference IN ('email', 'mobile', 'beide', 'keine')" json:"notification_preference"`
	CreatedAt              time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt              time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Relationships
	User *User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}
