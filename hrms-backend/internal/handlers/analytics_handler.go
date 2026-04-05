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
		"total_count":    totalUsers,
		"departed_count": departedUsers,
		"turnover_rate":  rate,
	})
}

// GetAttendanceStats returns stats on latecomers for the current month.
// A latecomer is defined as someone checking in after 09:15.
func GetAttendanceStats(c *gin.Context) {
	var lateCount int64
	// In a real system, we'd check for check_in > '09:15:00' for the current day or month
	// For simplicity, we query Attendance model
	err := database.DB.Model(&models.Attendance{}).
		Where("strftime('%H:%M:%S', clock_in) > ?", "09:15:00").
		Count(&lateCount).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate attendance stats"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"latecomers": lateCount,
	})
}

// GetPayrollExpenses returns the total net amount of payslips for each month of the current year.
func GetPayrollExpenses(c *gin.Context) {
	type Result struct {
		Month string  `json:"month"`
		Total float64 `json:"total"`
	}

	var results []Result
	// Query to sum net amounts group by month
	// Standard SQL/SQLite date handling
	err := database.DB.Model(&models.Payslip{}).
		Select("strftime('%m', generated_at) as month, sum(net_amount) as total").
		Where("strftime('%Y', generated_at) = strftime('%Y', 'now')").
		Group("month").
		Order("month ASC").
		Scan(&results).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate payroll expenses"})
		return
	}

	c.JSON(http.StatusOK, results)
}
