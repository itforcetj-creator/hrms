package models

import (
	"time"

	"gorm.io/gorm"
)

type WorkflowType string

const (
	WorkflowTypeLeave       WorkflowType = "LEAVE"
	WorkflowTypeHiring      WorkflowType = "HIRING"
	WorkflowTypeSalaryChange WorkflowType = "SALARY_CHANGE"
)

type WorkflowStatus string

const (
	WorkflowStatusPending   WorkflowStatus = "PENDING"
	WorkflowStatusApproved  WorkflowStatus = "APPROVED"
	WorkflowStatusRejected  WorkflowStatus = "REJECTED"
	WorkflowStatusInProgress WorkflowStatus = "IN_PROGRESS"
)

// WorkflowInstance tracks the lifecycle of an approval process.
type WorkflowInstance struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	Type          WorkflowType   `gorm:"not null" json:"type"`
	ObjectID      uint           `gorm:"not null" json:"object_id"` // Reference to LeaveRequest.ID, etc.
	CurrentStep   int            `gorm:"default:1" json:"current_step"`
	TotalSteps    int            `gorm:"not null" json:"total_steps"`
	Status        WorkflowStatus `gorm:"default:'PENDING'" json:"status"`
	InitiatorID   uint           `gorm:"not null" json:"initiator_id"`
	Initiator     User           `gorm:"foreignKey:InitiatorID" json:"initiator"`
	
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`

	Logs          []WorkflowLog  `gorm:"foreignKey:InstanceID" json:"logs"`
}

// WorkflowLog records every action in the workflow.
type WorkflowLog struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	InstanceID uint           `gorm:"not null;index" json:"instance_id"`
	StepNumber int            `gorm:"not null" json:"step_number"`
	Action     string         `gorm:"not null" json:"action"` // e.g., "APPROVE", "REJECT"
	ActorID    uint           `gorm:"not null" json:"actor_id"`
	Actor      User           `gorm:"foreignKey:ActorID" json:"actor"`
	Comments   string         `json:"comments"`
	Timestamp  time.Time      `json:"timestamp"`
}
