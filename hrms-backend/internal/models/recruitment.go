package models

import (
	"time"

	"gorm.io/gorm"
)

type JobOpening struct {
	ID                uint       `gorm:"primaryKey" json:"id"`
	Title             string     `json:"title"` // e.g., "Senior Go Developer"
	Description       string     `json:"description"`
	DepartmentID      uint       `json:"department_id"`
	Department        Department `gorm:"foreignKey:DepartmentID" json:"department"`
	Status            string     `gorm:"default:OPEN" json:"status"` // OPEN, CLOSED, ON_HOLD
	CreatedAt         time.Time  `json:"created_at"`
	ApplicationsCount int64      `gorm:"-" json:"applications_count"`
}

const (
	StatusJobOpen   = "OPEN"
	StatusJobClosed = "CLOSED"
	StatusJobOnHold = "ON_HOLD"
)

const (
	StatusCandidateApplied   = "APPLIED"
	StatusCandidateInterview = "INTERVIEW"
	StatusCandidateOffer     = "OFFER"
	StatusCandidateHired     = "HIRED"
	StatusCandidateRejected  = "REJECTED"
)

type Candidate struct {
	ID           uint   `gorm:"primaryKey" json:"id"`
	FullName     string `json:"full_name"`
	Email        string `gorm:"index" json:"email"`
	ResumePath   string `json:"resume_path"`
	Status       string `gorm:"default:APPLIED" json:"status"` // APPLIED, INTERVIEW, OFFER, HIRED, REJECTED
	JobOpeningID uint   `json:"job_opening_id"`

	JobOpening JobOpening `gorm:"foreignKey:JobOpeningID" json:"job_opening"`

	AppliedAt time.Time      `json:"applied_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
