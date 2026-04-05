package handlers

import (
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"hrms-backend/internal/service"
	"hrms-backend/internal/utils"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

func parseID(s string) int {
	id, _ := strconv.Atoi(s)
	return id
}

func isValidJobStatus(status string) bool {
	switch status {
	case models.StatusJobOpen, models.StatusJobClosed, models.StatusJobOnHold:
		return true
	default:
		return false
	}
}

func isValidCandidateStatus(status string) bool {
	switch status {
	case models.StatusCandidateApplied, models.StatusCandidateInterview, models.StatusCandidateOffer, models.StatusCandidateHired, models.StatusCandidateRejected:
		return true
	default:
		return false
	}
}

func attachCandidateCounts(jobs []models.JobOpening) error {
	if len(jobs) == 0 {
		return nil
	}

	type countRow struct {
		JobOpeningID uint  `json:"job_opening_id"`
		Count        int64 `json:"count"`
	}

	var rows []countRow
	if err := database.DB.Model(&models.Candidate{}).
		Select("job_opening_id, count(*) as count").
		Group("job_opening_id").
		Scan(&rows).Error; err != nil {
		return err
	}

	countByJob := make(map[uint]int64, len(rows))
	for _, row := range rows {
		countByJob[row.JobOpeningID] = row.Count
	}

	for i := range jobs {
		jobs[i].ApplicationsCount = countByJob[jobs[i].ID]
	}

	return nil
}

// UpdateCandidateStatus moves a candidate through the recruitment pipeline.
func UpdateCandidateStatus(c *gin.Context) {
	candidateID := c.Param("id")
	var input struct {
		NewStatus string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status is required"})
		return
	}

	newStatus := strings.ToUpper(strings.TrimSpace(input.NewStatus))
	if !isValidCandidateStatus(newStatus) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid candidate status"})
		return
	}

	tx := database.DB.Begin()
	if err := tx.Model(&models.Candidate{}).Where("id = ?", candidateID).Update("status", newStatus).Error; err != nil {
		tx.Rollback()
		utils.Logger.Error("Failed to update candidate status", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update candidate"})
		return
	}

	// Logging mutation
	adminID := c.GetUint("user_id")
	audit := models.AuditLog{
		UserID:    adminID,
		Action:    "UPDATE_CANDIDATE_STATUS",
		Table:     "candidates",
		RecordID:  uint(parseID(candidateID)),
		NewValues: "Status set to " + newStatus,
		CreatedAt: time.Now(),
	}
	tx.Create(&audit)
	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "Candidate status moved to " + newStatus})
}

// FinalizeHire converts a candidate to an active employee profile atomically.
func FinalizeHire(c *gin.Context) {
	candidateIDStr := c.Param("id")
	candidateID := uint(parseID(candidateIDStr))
	adminID := c.GetUint("user_id")
	ip := c.ClientIP()

	utils.Logger.Info("Finalizing hire for candidate", zap.Uint("candidate_id", candidateID))

	// Lazy initialization to ensure database.DB is connected
	svc := service.NewRecruitmentService(database.DB)
	employee, err := svc.FinalizeHire(candidateID, adminID, ip)
	if err != nil {
		utils.Logger.Error("Failed to finalize hire", zap.Uint("candidate_id", candidateID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Success! Candidate is now an employee.",
		"employee_id": employee.ID,
		"employee":    employee,
	})
}

// CreateJobOpening allows HR/Admin to post new roles.
func CreateJobOpening(c *gin.Context) {
	var input struct {
		Title        string `json:"title" binding:"required"`
		Description  string `json:"description"`
		DepartmentID uint   `json:"department_id" binding:"required"`
		Status       string `json:"status"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid job data"})
		return
	}

	title := strings.TrimSpace(input.Title)
	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title is required"})
		return
	}

	status := strings.ToUpper(strings.TrimSpace(input.Status))
	if status == "" {
		status = models.StatusJobOpen
	}
	if !isValidJobStatus(status) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid job status"})
		return
	}

	var department models.Department
	if err := database.DB.First(&department, input.DepartmentID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "department not found"})
		return
	}

	job := models.JobOpening{
		Title:        title,
		Description:  strings.TrimSpace(input.Description),
		DepartmentID: input.DepartmentID,
		Status:       status,
	}

	tx := database.DB.Begin()
	if err := tx.Create(&job).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create job opening"})
		return
	}

	// Audit Log
	adminID := c.GetUint("user_id")
	tx.Create(&models.AuditLog{
		UserID:    adminID,
		Action:    "CREATE_JOB_OPENING",
		Table:     "job_openings",
		RecordID:  job.ID,
		NewValues: job.Title,
		CreatedAt: time.Now(),
	})
	tx.Commit()

	if err := database.DB.Preload("Department").First(&job, job.ID).Error; err != nil {
		c.JSON(http.StatusCreated, job)
		return
	}
	job.ApplicationsCount = 0
	c.JSON(http.StatusCreated, job)
}

// UpdateJobOpening allows HR/Admin to edit posted roles.
func UpdateJobOpening(c *gin.Context) {
	jobID := c.Param("id")
	var job models.JobOpening
	if err := database.DB.First(&job, jobID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job opening not found"})
		return
	}

	var input struct {
		Title        *string `json:"title"`
		Description  *string `json:"description"`
		DepartmentID *uint   `json:"department_id"`
		Status       *string `json:"status"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid update payload"})
		return
	}

	updates := map[string]interface{}{}
	if input.Title != nil {
		title := strings.TrimSpace(*input.Title)
		if title == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "title cannot be empty"})
			return
		}
		updates["title"] = title
	}
	if input.Description != nil {
		updates["description"] = strings.TrimSpace(*input.Description)
	}
	if input.DepartmentID != nil {
		var department models.Department
		if err := database.DB.First(&department, *input.DepartmentID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "department not found"})
			return
		}
		updates["department_id"] = *input.DepartmentID
	}
	if input.Status != nil {
		status := strings.ToUpper(strings.TrimSpace(*input.Status))
		if !isValidJobStatus(status) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid job status"})
			return
		}
		updates["status"] = status
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields provided for update"})
		return
	}

	tx := database.DB.Begin()
	if err := tx.Model(&job).Updates(updates).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update job opening"})
		return
	}

	adminID := c.GetUint("user_id")
	tx.Create(&models.AuditLog{
		UserID:    adminID,
		Action:    "UPDATE_JOB_OPENING",
		Table:     "job_openings",
		RecordID:  job.ID,
		NewValues: "Job opening updated",
		CreatedAt: time.Now(),
	})
	tx.Commit()

	if err := database.DB.Preload("Department").First(&job, job.ID).Error; err != nil {
		c.JSON(http.StatusOK, job)
		return
	}
	var count int64
	database.DB.Model(&models.Candidate{}).Where("job_opening_id = ?", job.ID).Count(&count)
	job.ApplicationsCount = count

	c.JSON(http.StatusOK, job)
}

// DeleteJobOpening removes a role and associated candidate pipeline data.
func DeleteJobOpening(c *gin.Context) {
	jobID := c.Param("id")
	var job models.JobOpening
	if err := database.DB.First(&job, jobID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job opening not found"})
		return
	}

	tx := database.DB.Begin()

	candidateSubquery := tx.Model(&models.Candidate{}).Select("id").Where("job_opening_id = ?", job.ID)
	if err := tx.Where("candidate_id IN (?)", candidateSubquery).Delete(&models.InterviewNote{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete interview notes"})
		return
	}

	if err := tx.Where("job_opening_id = ?", job.ID).Delete(&models.Candidate{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete candidates"})
		return
	}

	if err := tx.Delete(&job).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete job opening"})
		return
	}

	adminID := c.GetUint("user_id")
	tx.Create(&models.AuditLog{
		UserID:    adminID,
		Action:    "DELETE_JOB_OPENING",
		Table:     "job_openings",
		RecordID:  job.ID,
		NewValues: "Job opening deleted",
		CreatedAt: time.Now(),
	})
	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "Job opening deleted successfully"})
}

// GetJobOpenings retrieves all job openings with department preloading.
func GetJobOpenings(c *gin.Context) {
	var jobs []models.JobOpening
	if err := database.DB.Preload("Department").Order("created_at desc").Find(&jobs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch job openings"})
		return
	}
	if err := attachCandidateCounts(jobs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch candidate counts"})
		return
	}
	c.JSON(http.StatusOK, jobs)
}

// GetJobOpeningDetails returns a single job with candidate pipeline details.
func GetJobOpeningDetails(c *gin.Context) {
	jobID := c.Param("id")
	var job models.JobOpening
	if err := database.DB.Preload("Department").First(&job, jobID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job opening not found"})
		return
	}

	var candidates []models.Candidate
	if err := database.DB.Where("job_opening_id = ?", job.ID).Order("id desc").Find(&candidates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch candidates"})
		return
	}
	job.ApplicationsCount = int64(len(candidates))

	c.JSON(http.StatusOK, gin.H{
		"job":        job,
		"candidates": candidates,
	})
}

// GetCandidatesByJob retrieves all candidates for a specific job.
func GetCandidatesByJob(c *gin.Context) {
	jobID := c.Param("id")
	var candidates []models.Candidate
	if err := database.DB.Where("job_opening_id = ?", jobID).Order("id desc").Find(&candidates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch candidates"})
		return
	}
	c.JSON(http.StatusOK, candidates)
}

// ApplyForJob is a public endpoint for candidates to submit resumes.
func ApplyForJob(c *gin.Context) {
	fullName := c.PostForm("full_name")
	email := c.PostForm("email")
	jobIDStr := c.PostForm("job_opening_id")
	jobID := uint(parseID(jobIDStr))

	file, err := c.FormFile("resume")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Resume is required"})
		return
	}

	path := "uploads/resumes/" + uuid.New().String() + filepath.Ext(file.Filename)
	if err := c.SaveUploadedFile(file, path); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save resume"})
		return
	}

	candidate := models.Candidate{
		FullName:     fullName,
		Email:        email,
		ResumePath:   path,
		JobOpeningID: jobID,
		Status:       models.StatusCandidateApplied,
	}

	if err := database.DB.Create(&candidate).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit application"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Application submitted", "id": candidate.ID})
}

// PostInterviewNote adds feedback to a candidate's scorecard.
func PostInterviewNote(c *gin.Context) {
	var note models.InterviewNote
	interviewerID := c.GetUint("user_id")

	if err := c.ShouldBindJSON(&note); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	note.InterviewerID = interviewerID

	if err := database.DB.Create(&note).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save note"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Feedback recorded", "note": note})
}
