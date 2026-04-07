package models

import (
	"time"

	"gorm.io/gorm"
)

const (
	LeaveTypeVacation  = "VACATION"
	LeaveTypeSick      = "SICK"
	LeaveTypeUnpaid    = "UNPAID"
	LeaveTypeMaternity = "MATERNITY"
)

const (
	StatusPending  = "PENDING"
	StatusApproved = "APPROVED"
	StatusRejected = "REJECTED"
)

// LeaveRequest represents a leave submission lifecycle from employee request
// through managerial/HR review and final decision.
type LeaveRequest struct {
	ID                 uint           `gorm:"primaryKey" json:"id"`
	UserID             uint           `gorm:"not null;index:idx_leave_user_status,priority:1" json:"user_id"`
	User               User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Type               string         `gorm:"not null" json:"type"` // e.g., "VACATION", "SICK"
	StartDate          time.Time      `gorm:"not null" json:"start_date"`
	EndDate            time.Time      `gorm:"not null" json:"end_date"`
	Days               float64        `gorm:"not null;default:0" json:"days"`
	Status             string         `gorm:"not null;default:'PENDING';index:idx_leave_user_status,priority:2" json:"status"`
	Reason             string         `json:"reason"`
	WorkflowInstanceID *uint          `json:"workflow_instance_id,omitempty"`
	ApprovedBy         *uint          `json:"approved_by,omitempty"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`
}
