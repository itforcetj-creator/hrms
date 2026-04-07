package handlers

import (
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// GetOnboardingTasks returns onboarding tasks for the authenticated user
func GetOnboardingTasks(c *gin.Context) {
	userID := c.GetUint("user_id")

	var tasks []models.OnboardingTask
	if err := database.DB.Where("user_id = ?", userID).Order("created_at ASC").Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve onboarding tasks"})
		return
	}

	c.JSON(http.StatusOK, tasks)
}

// CreateOnboardingTask creates a new onboarding task (HR/Admin can create for any user)
func CreateOnboardingTask(c *gin.Context) {
	type input struct {
		UserID      uint   `json:"user_id" binding:"required"`
		Title       string `json:"title" binding:"required"`
		Description string `json:"description"`
		DueDate     string `json:"due_date"`
	}

	var req input
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var dueDate time.Time
	if req.DueDate != "" {
		var err error
		dueDate, err = time.Parse("2006-01-02", req.DueDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid due_date format, use YYYY-MM-DD"})
			return
		}
	}

	task := models.OnboardingTask{
		UserID:      req.UserID,
		Title:       req.Title,
		Description: req.Description,
		DueDate:     dueDate,
		IsCompleted: false,
	}

	if err := database.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create onboarding task"})
		return
	}

	c.JSON(http.StatusCreated, task)
}

// UpdateOnboardingTask updates an onboarding task (e.g., toggle completion)
func UpdateOnboardingTask(c *gin.Context) {
	taskID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	type input struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		DueDate     *string `json:"due_date"`
		IsCompleted *bool   `json:"is_completed"`
	}

	var req input
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var task models.OnboardingTask
	if err := database.DB.First(&task, taskID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Onboarding task not found"})
		return
	}

	updates := map[string]interface{}{}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.DueDate != nil {
		if t, err := time.Parse("2006-01-02", *req.DueDate); err == nil {
			updates["due_date"] = t
		}
	}
	if req.IsCompleted != nil {
		updates["is_completed"] = *req.IsCompleted
		if *req.IsCompleted {
			userID := c.GetUint("user_id")
			updates["verified_by"] = userID
		}
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update"})
		return
	}

	if err := database.DB.Model(&task).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update onboarding task"})
		return
	}

	// Fetch updated task
	database.DB.First(&task, taskID)
	c.JSON(http.StatusOK, task)
}

// DeleteOnboardingTask deletes an onboarding task (soft delete)
func DeleteOnboardingTask(c *gin.Context) {
	taskID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	if err := database.DB.Delete(&models.OnboardingTask{}, taskID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete onboarding task"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Onboarding task deleted successfully"})
}

// GetOnboardingTasksForUser returns onboarding tasks for a specific user (HR/Admin view)
func GetOnboardingTasksForUser(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("user_id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var tasks []models.OnboardingTask
	if err := database.DB.Where("user_id = ?", userID).Order("created_at ASC").Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve onboarding tasks"})
		return
	}

	c.JSON(http.StatusOK, tasks)
}
