package models

import (
	"time"

	"gorm.io/gorm"
)

// AuditLog tracks every state-changing event in the HRMS.
// It is used for legal compliance, troubleshooting, and security audits.
type AuditLog struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"index" json:"user_id"`     // Who did it
	Action    string         `gorm:"not null" json:"action"`    // CREATE/UPDATE/DELETE
	Table     string         `gorm:"not null" json:"table"`     // Target entity (e.g., users, payslips)
	RecordID  uint           `gorm:"index" json:"record_id"`    // ID of the affected record
	OldValues string         `gorm:"type:text" json:"old_values"` // JSON string of previous state
	NewValues string         `gorm:"type:text" json:"new_values"` // JSON string of new state
	IPAddress string         `json:"ip_address"`                // Source IP
	Message   string         `json:"message"`                   // Human-readable description
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
