package models

import (
	"time"

	"gorm.io/gorm"
)

// Notification types
const (
	NotificationTypeSystem = "SYSTEM"
	NotificationTypeEmail  = "EMAIL"
	NotificationTypeSMS    = "SMS"
)

// Notification represents an alert sent to a specific user.
type Notification struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"not null;index" json:"user_id"`
	Title     string         `gorm:"not null" json:"title"`
	Message   string         `gorm:"type:text;not null" json:"message"`
	Type      string         `gorm:"default:'SYSTEM'" json:"type"` // SYSTEM, EMAIL, SMS
	IsRead    bool           `gorm:"default:false" json:"is_read"`
	Link      string         `json:"link"` // Optional link to redirect user when clicked (e.g. /leave/requests/1)
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
