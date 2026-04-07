package models

import (
	"time"

	"gorm.io/gorm"
)

// AttendanceStatus denotes the presence state of an employee on a given workday.
type AttendanceStatus string

const (
	StatusPresent AttendanceStatus = "PRESENT"
	StatusLate    AttendanceStatus = "LATE"
	StatusAbsent  AttendanceStatus = "ABSENT"
	StatusOnLeave AttendanceStatus = "ON_LEAVE"
)

// Attendance represents a single daily check-in/out record for an employee.
// It tracks location and calculates total working hours.
type Attendance struct {
	ID         uint             `gorm:"primaryKey" json:"id"`
	UserID     uint             `gorm:"not null;index:idx_attendance_user_date,priority:1" json:"user_id"`
	User       User             `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Date       time.Time        `gorm:"not null;type:date;index:idx_attendance_user_date,priority:2" json:"date"`
	ClockIn    *time.Time       `json:"clock_in"`
	ClockOut   *time.Time       `json:"clock_out"`
	TotalHours float64          `gorm:"default:0" json:"total_hours"`
	Location   string           `json:"location"`
	Status     AttendanceStatus `gorm:"default:'ABSENT'" json:"status"`
	CreatedAt  time.Time        `json:"created_at"`
	UpdatedAt  time.Time        `json:"updated_at"`
	DeletedAt  gorm.DeletedAt   `gorm:"index" json:"-"`
}
