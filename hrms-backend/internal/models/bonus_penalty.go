package models

import (
	"time"

	"gorm.io/gorm"
)

type BonusPenaltyType string

const (
	TypeBonus   BonusPenaltyType = "BONUS"
	TypePenalty BonusPenaltyType = "PENALTY"
)

type BonusPenalty struct {
	ID        uint             `gorm:"primaryKey" json:"id"`
	UserID    uint             `gorm:"index;not null" json:"user_id"`
	User      User             `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Type      BonusPenaltyType `gorm:"not null" json:"type"`
	Amount    float64          `gorm:"not null" json:"amount"`
	Reason    string           `json:"reason"`
	Date      time.Time        `gorm:"not null" json:"date"`
	Month     int             `gorm:"index;not null" json:"month"`
	Year      int             `gorm:"index;not null" json:"year"`
	CreatedBy uint             `json:"created_by"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
	DeletedAt gorm.DeletedAt   `gorm:"index" json:"-"`
}
