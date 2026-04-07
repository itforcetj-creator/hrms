package handlers

import (
	"hrms-backend/database"
	"hrms-backend/internal/models"
	internalUtils "hrms-backend/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetAnnouncements returns all announcements with pagination
func GetAnnouncements(c *gin.Context) {
	var announcements []models.Announcement

	// Pagination
	var total int64
	database.DB.Model(&models.Announcement{}).Count(&total)

	paginationParams := internalUtils.PaginationParams{
		Page:     internalUtils.ParseIntOrDefault(c.Query("page"), 1),
		PageSize: internalUtils.ParseIntOrDefault(c.Query("page_size"), 20),
	}
	query := internalUtils.ApplyPagination(paginationParams, database.DB)

	query.Preload("Author", func(db *gorm.DB) *gorm.DB {
		return db.Select("id", "full_name", "email", "role") // secure author preload
	}).Order("created_at desc").Find(&announcements)

	c.JSON(http.StatusOK, internalUtils.PaginatedResponse{
		Data:     announcements,
		Total:    total,
		Page:     paginationParams.Page,
		PageSize: paginationParams.PageSize,
	})
}

// CreateAnnouncement creates a new announcement
func CreateAnnouncement(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var input struct {
		Title        string `json:"title" binding:"required"`
		Content      string `json:"content" binding:"required"`
		Priority     string `json:"priority"`
		Target       string `json:"target"`
		DepartmentID *uint  `json:"department_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Default priorities if missing
	if input.Priority == "" {
		input.Priority = models.PriorityInfo
	}
	if input.Target == "" {
		input.Target = models.TargetAll
	}

	announcement := models.Announcement{
		Title:        input.Title,
		Content:      input.Content,
		Priority:     input.Priority,
		Target:       input.Target,
		DepartmentID: input.DepartmentID,
		AuthorID:     userID.(uint),
	}

	if err := database.DB.Create(&announcement).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create announcement"})
		return
	}

	c.JSON(http.StatusCreated, announcement)
}

// DeleteAnnouncement deletes an announcement by ID
func DeleteAnnouncement(c *gin.Context) {
	id := c.Param("id")

	var announcement models.Announcement
	if err := database.DB.First(&announcement, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Announcement not found"})
		return
	}

	database.DB.Delete(&announcement)
	c.JSON(http.StatusOK, gin.H{"message": "Announcement deleted successfully"})
}
