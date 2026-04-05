package service

import (
	"errors"
	"hrms-backend/internal/models"
	"hrms-backend/utils"
	"time"

	"gorm.io/gorm"
)

// RecruitmentService handles the transition from candidate to employee.
type RecruitmentService struct {
	db *gorm.DB
}

func NewRecruitmentService(db *gorm.DB) *RecruitmentService {
	return &RecruitmentService{db: db}
}

// FinalizeHire converts a candidate to an active employee profile.
// It performs this as an atomic transaction.
func (s *RecruitmentService) FinalizeHire(candidateID uint, adminID uint, ip string) (*models.User, error) {
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 1. Get Candidate with Job Details
	var candidate models.Candidate
	if err := tx.Preload("JobOpening").First(&candidate, candidateID).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("candidate not found")
	}

	if candidate.Status == "HIRED" {
		tx.Rollback()
		return nil, errors.New("candidate is already hired")
	}

	// 2. Create User Profile
	// Default password for first login (should be changed later)
	tempPass, _ := utils.HashPassword("Welcome2026!")
	
	newEmployee := models.User{
		FullName:     candidate.FullName,
		Email:        candidate.Email,
		Password:     tempPass,
		Role:         models.RoleEmployee,
		DepartmentID: models.UintPtr(candidate.JobOpening.DepartmentID),
		IsActive:     true,
		LeaveBalance: 20.0, // Initial balance
	}

	if err := tx.Create(&newEmployee).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 3. Update Candidate Status
	if err := tx.Model(&candidate).Update("status", "HIRED").Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 4. Record Audit Log
	audit := models.AuditLog{
		UserID:    adminID,
		Action:    "HIRE_CANDIDATE",
		Table:     "users",
		RecordID:  newEmployee.ID,
		NewValues: candidate.FullName + " hired from candidacy " + string(rune(candidate.ID)),
		IPAddress: ip,
		Message:   "Candidate officially hired and converted to employee profile",
		CreatedAt: time.Now(),
	}
	if err := tx.Create(&audit).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return &newEmployee, nil
}
