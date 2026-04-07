package models

import (
	"time"

	"gorm.io/gorm"
)

// OnboardingTask represents a task for a new employee during their onboarding period.
type OnboardingTask struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	UserID       uint           `gorm:"index;not null" json:"user_id"`
	Title        string         `gorm:"not null" json:"title"`
	Description  string         `gorm:"type:text" json:"description"`
	DueDate      time.Time      `json:"due_date"`
	IsCompleted  bool           `gorm:"default:false" json:"is_completed"`
	VerifiedBy   *uint          `json:"verified_by"` // HR/Manager who verified
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
