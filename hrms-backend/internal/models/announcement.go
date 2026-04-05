package models

import (
	"time"

	"gorm.io/gorm"
)

// Priority levels for announcements
const (
	PriorityInfo    = "INFO"
	PriorityWarning = "WARNING"
	PriorityUrgent  = "URGENT"
)

// Target types for announcements
const (
	TargetAll        = "ALL"
	TargetDepartment = "DEPARTMENT"
)

// Announcement represents a company-wide or department-specific news/announcement.
type Announcement struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Title        string         `gorm:"not null" json:"title"`
	Content      string         `gorm:"type:text;not null" json:"content"`
	Priority     string         `gorm:"default:'INFO'" json:"priority"` // INFO, WARNING, URGENT
	Target       string         `gorm:"default:'ALL'" json:"target"`    // ALL, DEPARTMENT
	DepartmentID *uint          `json:"department_id"`                  // Nullable. If Target is DEPARTMENT, this specifies which one.
	AuthorID     uint           `gorm:"not null" json:"author_id"`
	Author       User           `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
