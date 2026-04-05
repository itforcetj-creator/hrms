package models

import (
	"time"

	"gorm.io/gorm"
)

type ExitType string

const (
	ExitResignation ExitType = "RESIGNATION"
	ExitTermination ExitType = "TERMINATION"
	ExitRedundancy  ExitType = "REDUNDANCY"
)

// ExitRecord documents the formal separation of an employee from the company.
type ExitRecord struct {
	ID                 uint           `gorm:"primaryKey" json:"id"`
	UserID             uint           `gorm:"index;not null" json:"user_id"`
	User               *User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	ExitType           ExitType       `gorm:"not null" json:"exit_type"`
	LastWorkingDay     time.Time      `json:"last_working_day"`
	FinalPayoutAmount  float64        `json:"final_payout_amount"`
	SettlementStatus   string         `gorm:"default:'PENDING'" json:"settlement_status"` // PENDING, PAID
	Reason             string         `gorm:"type:text" json:"reason"`
	
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`
}
