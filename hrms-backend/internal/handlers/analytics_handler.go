package handlers

import (
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetHeadcountStats returns the total number of active employees by department.
func GetHeadcountStats(c *gin.Context) {
	type Result struct {
		Department string `json:"department"`
		Count      int    `json:"count"`
	}

	var results []Result
	// Query to count users group by department
	err := database.DB.Model(&models.User{}).
		Select("departments.name as department, count(users.id) as count").
		Joins("left join departments on departments.id = users.department_id").
		Where("users.is_active = ?", true).
		Group("departments.name").
		Scan(&results).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate headcount"})
		return
	}

	c.JSON(http.StatusOK, results)
}

// GetTurnoverRate calculates the percentage of employees who left in the current year.
func GetTurnoverRate(c *gin.Context) {
	var totalUsers int64
	var departedUsers int64

	database.DB.Model(&models.User{}).Count(&totalUsers)
	database.DB.Model(&models.User{}).Where("is_active = ?", false).Count(&departedUsers)

	if totalUsers == 0 {
		c.JSON(http.StatusOK, gin.H{"turnover_rate": 0})
		return
	}

	rate := (float64(departedUsers) / float64(totalUsers)) * 100
	c.JSON(http.StatusOK, gin.H{
		"total_count":     totalUsers,
		"departed_count":  departedUsers,
		"turnover_rate":   rate,
	})
}
