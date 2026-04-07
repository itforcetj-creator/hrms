package models

import (
	"time"

	"gorm.io/gorm"
)

type Document struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	UserID         uint           `gorm:"index" json:"user_id"`
	User           *User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	FileName       string         `json:"file_name"`
	FilePath       string         `json:"file_path"`
	FileType       string         `json:"file_type"`
	UploadedByRole string         `json:"uploaded_by_role"` // "ADMIN", "HR", "USER"
	IsContract     bool           `gorm:"default:false" json:"is_contract"`
	ExpiryDate     *time.Time     `json:"expiry_date"`
	CreatedAt      time.Time      `json:"created_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}
