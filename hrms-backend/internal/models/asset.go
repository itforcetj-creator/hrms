package models

import (
	"time"

	"gorm.io/gorm"
)

type AssetStatus string

const (
	AssetStatusStock    AssetStatus = "STOCK"
	AssetStatusAssigned AssetStatus = "ASSIGNED"
	AssetStatusRepair   AssetStatus = "REPAIR"
)

// Asset represents a company-owned item (e.g., Laptop, Monitor, Key) 
// tracked for inventory and assignment purposes.
type Asset struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	Name           string         `gorm:"not null" json:"name"`
	SerialNumber   string         `gorm:"unique;not null" json:"serial_number"`
	Category       string         `json:"category"`
	Status         AssetStatus    `gorm:"default:'STOCK'" json:"status"`
	AssignedToUserID *uint        `json:"assigned_to_user_id"`
	AssignedTo     *User          `gorm:"foreignKey:AssignedToUserID" json:"assigned_to,omitempty"`
	
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}
