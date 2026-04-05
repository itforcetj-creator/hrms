package handlers

import (
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// CreateBonusPenalty adds a new bonus or penalty record for a user.
func CreateBonusPenalty(c *gin.Context) {
	var input struct {
		UserID uint                    `json:"user_id" binding:"required"`
		Type   models.BonusPenaltyType `json:"type" binding:"required"`
		Amount float64                 `json:"amount" binding:"required"`
		Reason string                  `json:"reason" binding:"required"`
		Date   string                  `json:"date" binding:"required"` // Format: YYYY-MM-DD
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parsedDate, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
		return
	}

	adminID := c.GetUint("user_id")

	record := models.BonusPenalty{
		UserID:    input.UserID,
		Type:      input.Type,
		Amount:    input.Amount,
		Reason:    input.Reason,
		Date:      parsedDate,
		Month:     int(parsedDate.Month()),
		Year:      parsedDate.Year(),
		CreatedBy: adminID,
	}

	if err := database.DB.Create(&record).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create record"})
		return
	}

	c.JSON(http.StatusCreated, record)
}

// GetBonusPenalties returns records, optionally filtered by user, month, and year.
func GetBonusPenalties(c *gin.Context) {
	userIDStr := c.Query("user_id")
	monthStr := c.Query("month")
	yearStr := c.Query("year")

	query := database.DB.Model(&models.BonusPenalty{}).Order("date desc")

	if userIDStr != "" {
		uid, _ := strconv.Atoi(userIDStr)
		query = query.Where("user_id = ?", uid)
	}
	if monthStr != "" {
		m, _ := strconv.Atoi(monthStr)
		query = query.Where("month = ?", m)
	}
	if yearStr != "" {
		y, _ := strconv.Atoi(yearStr)
		query = query.Where("year = ?", y)
	}

	var records []models.BonusPenalty
	if err := query.Preload("User").Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch records"})
		return
	}

	c.JSON(http.StatusOK, records)
}

// DeleteBonusPenalty removes a record.
func DeleteBonusPenalty(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.BonusPenalty{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete record"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Record deleted successfully"})
}
