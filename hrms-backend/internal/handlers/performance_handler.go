package handlers

import (
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"hrms-backend/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

// CreateGoal allows an employee or manager to set a new performance goal.
func CreateGoal(c *gin.Context) {
	var input struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description"`
		TargetDate  string `json:"target_date"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	userID := c.GetUint("user_id")
	goal := models.Goal{
		UserID:      userID,
		Title:       input.Title,
		Description: input.Description,
	}

	if err := database.DB.Create(&goal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create goal"})
		return
	}

	c.JSON(http.StatusCreated, goal)
}

// GetMyGoals retrieves all professional goals for the logged-in user.
func GetMyGoals(c *gin.Context) {
	userID := c.GetUint("user_id")
	var goals []models.Goal
	database.DB.Preload("KeyResults").Where("user_id = ?", userID).Find(&goals)
	c.JSON(http.StatusOK, goals)
}

// CreateReviewCycle allows Admin/HR to open a new performance evaluation period.
func CreateReviewCycle(c *gin.Context) {
	var cycle models.ReviewCycle
	if err := c.ShouldBindJSON(&cycle); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid cycle data"})
		return
	}

	if err := database.DB.Create(&cycle).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create cycle"})
		return
	}

	c.JSON(http.StatusCreated, cycle)
}

// SubmitReview handles performance evaluation submissions.
func SubmitReview(c *gin.Context) {
	var review models.PerformanceReview
	if err := c.ShouldBindJSON(&review); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid review data"})
		return
	}

	if err := database.DB.Create(&review).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit review"})
		return
	}

	c.JSON(http.StatusCreated, review)
}

// GetReviewCycles retrieves all performance evaluation periods (Admin/HR view).
func GetReviewCycles(c *gin.Context) {
	var cycles []models.ReviewCycle
	if err := database.DB.Find(&cycles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch cycles"})
		return
	}
	c.JSON(http.StatusOK, cycles)
}

// GetPerformanceReviews retrieves all submitted evaluations (Admin/HR view).
func GetPerformanceReviews(c *gin.Context) {
	var reviews []models.PerformanceReview

	// Pagination
	var total int64
	database.DB.Model(&models.PerformanceReview{}).Count(&total)

	paginationParams := utils.PaginationParams{
		Page:     utils.ParseIntOrDefault(c.Query("page"), 1),
		PageSize: utils.ParseIntOrDefault(c.Query("page_size"), 20),
	}
	query := utils.ApplyPagination(paginationParams, database.DB)

	if err := query.Preload("Employee").Preload("Reviewer").Preload("Cycle").Find(&reviews).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
		return
	}
	c.JSON(http.StatusOK, utils.PaginatedResponse{
		Data:     reviews,
		Total:    total,
		Page:     paginationParams.Page,
		PageSize: paginationParams.PageSize,
	})
}
