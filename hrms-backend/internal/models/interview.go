package models

import "time"

type InterviewNote struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	CandidateID   uint      `json:"candidate_id"`
	InterviewerID uint      `json:"interviewer_id"` // The Dept Head/Manager
	Interviewer   *User     `gorm:"foreignKey:InterviewerID" json:"interviewer,omitempty"`
	Score         int       `json:"score"` // 1 to 5 rating
	Comments      string    `json:"comments"`
	CreatedAt     time.Time `json:"created_at"`
}
