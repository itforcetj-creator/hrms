package models

import (
	"time"

	"gorm.io/gorm"
)

// ReviewCycle represents a scheduled performance evaluation period (e.g., Q1 2024).
type ReviewCycle struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"unique;not null" json:"name"`
	StartDate time.Time      `json:"start_date"`
	EndDate   time.Time      `json:"end_date"`
	Status    string         `gorm:"default:'ACTIVE'" json:"status"` // ACTIVE, CLOSED
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// PerformanceReview stores the actual review content submitted by manager and employee.
type PerformanceReview struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	ReviewCycleID uint           `gorm:"index" json:"review_cycle_id"`
	EmployeeID    uint           `gorm:"index" json:"employee_id"`
	ManagerID     uint           `gorm:"index" json:"manager_id"`
	EmployeeNotes string         `gorm:"type:text" json:"employee_notes"`
	ManagerNotes  string         `gorm:"type:text" json:"manager_notes"`
	Rating        int            `json:"rating"` // 1-5
	Status        string         `gorm:"default:'DRAFT'" json:"status"` // DRAFT, SUBMITTED, FINALIZED
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// Goal (OKR) tracking for employees.
type Goal struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	UserID      uint           `gorm:"index" json:"user_id"`
	Title       string         `gorm:"not null" json:"title"`
	Description string         `json:"description"`
	Status      string         `gorm:"default:'IN_PROGRESS'" json:"status"` // IN_PROGRESS, COMPLETED, CANCELLED
	Progress    float64        `gorm:"default:0" json:"progress"` // 0-100
	TargetDate  time.Time      `json:"target_date"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	KeyResults  []KeyResult    `gorm:"foreignKey:GoalID" json:"key_results"`
}

// KeyResult are the measurable milestones for a Goal.
type KeyResult struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	GoalID      uint      `gorm:"index" json:"goal_id"`
	Title       string    `gorm:"not null" json:"title"`
	TargetValue float64   `json:"target_value"`
	CurrentValue float64  `json:"current_value"`
	CreatedAt   time.Time `json:"created_at"`
}
