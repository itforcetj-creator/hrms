package service

import (
	"errors"
	"hrms-backend/internal/models"
	"time"

	"gorm.io/gorm"
)

type WorkflowService struct {
	db *gorm.DB
}

func NewWorkflowService(db *gorm.DB) *WorkflowService {
	return &WorkflowService{db: db}
}

// InitiateWorkflow creates a new workflow instance for a given object.
func (s *WorkflowService) InitiateWorkflow(instanceType models.WorkflowType, objectID uint, initiatorID uint) (*models.WorkflowInstance, error) {
	totalSteps := 0
	switch instanceType {
	case models.WorkflowTypeLeave:
		totalSteps = 2 // 1: Manager/DeptHead, 2: HR
	case models.WorkflowTypeSalaryChange:
		totalSteps = 3 // 1: DeptHead, 2: HR, 3: Director
	default:
		totalSteps = 1
	}

	instance := &models.WorkflowInstance{
		Type:        instanceType,
		ObjectID:    objectID,
		InitiatorID: initiatorID,
		TotalSteps:  totalSteps,
		CurrentStep: 1,
		Status:      models.WorkflowStatusInProgress,
	}

	if err := s.db.Create(instance).Error; err != nil {
		return nil, err
	}

	return instance, nil
}

// ProcessStep handles an approval or rejection for the current step.
func (s *WorkflowService) ProcessStep(instanceID uint, actorID uint, action string, comments string) error {
	var instance models.WorkflowInstance
	if err := s.db.Preload("Initiator").First(&instance, instanceID).Error; err != nil {
		return err
	}

	if instance.Status != models.WorkflowStatusInProgress {
		return errors.New("workflow is not in progress")
	}

	// 1. Check Permissions for the current step
	var actor models.User
	if err := s.db.First(&actor, actorID).Error; err != nil {
		return err
	}

	if err := s.verifyStepPermission(&instance, &actor); err != nil {
		return err
	}

	// 2. Create Audit Log
	log := models.WorkflowLog{
		InstanceID: instance.ID,
		StepNumber: instance.CurrentStep,
		Action:     action,
		ActorID:    actorID,
		Comments:   comments,
		Timestamp:  time.Now(),
	}

	if err := s.db.Create(&log).Error; err != nil {
		return err
	}

	// 3. Update Workflow State
	if action == "REJECT" {
		instance.Status = models.WorkflowStatusRejected
	} else if action == "APPROVE" {
		if instance.CurrentStep >= instance.TotalSteps {
			instance.Status = models.WorkflowStatusApproved
		} else {
			instance.CurrentStep++
		}
	}

	return s.db.Save(&instance).Error
}

// verifyStepPermission checks if the actor can approve the current step.
func (s *WorkflowService) verifyStepPermission(instance *models.WorkflowInstance, actor *models.User) error {
	// Simple RBAC-based logic for steps
	switch instance.Type {
	case models.WorkflowTypeLeave:
		if instance.CurrentStep == 1 {
			// Step 1: Manager or Department Head
			// Check if actor is the initiator's manager OR has DEPARTMENT_HEAD role in the same department
			isManager := actor.ID == *instance.Initiator.ManagerID
			isDeptHead := actor.Role == models.RoleManager && *actor.DepartmentID == *instance.Initiator.DepartmentID
			isAdmin := actor.Role == models.RoleAdmin
			
			if !isManager && !isDeptHead && !isAdmin {
				return errors.New("only a manager or department head can approve this step")
			}
		} else if instance.CurrentStep == 2 {
			// Step 2: HR
			if actor.Role != models.RoleHR && actor.Role != models.RoleAdmin {
				return errors.New("only HR or Admin can approve this final step")
			}
		}
	}
	return nil
}
