package models

import (
	"time"

	"gorm.io/gorm"
)

const (
	RoleAdmin    = "ADMIN"
	RoleDirector = "DIRECTOR"
	RoleHR       = "HR"
	RoleManager  = "DEPARTMENT_HEAD"
	RoleEmployee = "USER"
)

type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Email     string         `gorm:"unique;not null" json:"email"`
	Password  string         `gorm:"password;not null" json:"-"` // "-" means never return in JSON
	FullName  string         `json:"full_name"`
	Role      string         `gorm:"default:USER" json:"role"`
	IsActive  bool           `gorm:"default:true" json:"is_active"`
	
	// Offboarding fields
	DeactivatedAt     *time.Time `json:"deactivated_at,omitempty"`
	TerminationReason string     `json:"termination_reason,omitempty"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	
	DepartmentID *uint         `json:"department_id"`
	Department   Department   `gorm:"foreignKey:DepartmentID" json:"department,omitempty"`
	PositionID   *uint        `json:"position_id"`
	Position     Position     `gorm:"foreignKey:PositionID" json:"position,omitempty"`
	ManagerID    *uint        `json:"manager_id"` // Nullable for top-level managers
	Manager      *User        `gorm:"foreignKey:ManagerID" json:"manager,omitempty"`
	
	LeaveBalance float64      `gorm:"default:20.0" json:"leave_balance"`
	
	// Passport and Personal Information
	PassportSeries     string     `json:"passport_series"`
	PassportNumber     string     `json:"passport_number"`
	PassportIssuedBy   string     `json:"passport_issued_by"`
	PassportIssuedDate *time.Time `json:"passport_issued_date"`
	BirthDate          *time.Time `json:"birth_date"`
	BirthPlace         string     `json:"birth_place"`
	INN                string     `json:"inn"`
	SNILS              string     `json:"snils"`
	Address            string     `json:"address"`
	Phone              string     `json:"phone"`

	Documents    []Document    `gorm:"foreignKey:UserID" json:"documents"`
}

// UintPtr helper function to create a pointer to a uint
func UintPtr(v uint) *uint {
	return &v
}
