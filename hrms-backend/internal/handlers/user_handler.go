package handlers

import (
	"fmt"
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"hrms-backend/internal/service"
	internalUtils "hrms-backend/internal/utils"
	"hrms-backend/utils"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)


func GetEmployeeProfile(c *gin.Context) {
	id := c.Param("id")
	var user models.User

	// Preload related data
	if err := database.DB.Preload("Department").Preload("Position").Preload("Manager").Preload("Documents").First(&user, id).Error; err != nil {
		internalUtils.Logger.Error("User not found", zap.String("id", id), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

func GetEmployeeDirectory(c *gin.Context) {
	var users []models.User
	query := database.DB

	if dept := c.Query("department"); dept != "" {
		query = query.Where("department_id = ?", dept)
	}
	if role := c.Query("role"); role != "" {
		query = query.Where("role = ?", role)
	}
	if search := c.Query("search"); search != "" {
		query = query.Where("full_name ILIKE ? OR email ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	query.Preload("Department").Preload("Position").Find(&users)
	c.JSON(http.StatusOK, users)
}

// CreateUser handles administrative onboarding of new employees.
func CreateUser(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user data"})
		return
	}

	hashedPassword, _ := utils.HashPassword(user.Password)
	user.Password = hashedPassword

	// Handle 0 values for dropdowns (not selected)
	if user.DepartmentID != nil && *user.DepartmentID == 0 {
		user.DepartmentID = nil
	}
	if user.PositionID != nil && *user.PositionID == 0 {
		user.PositionID = nil
	}

	if err := database.DB.Create(&user).Error; err != nil {
		internalUtils.Logger.Error("Failed to create user", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, user)
}

// UpdateUser handles employee updates (department, role, status).
func UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var updateData map[string]interface{}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid update data"})
		return
	}

	// Hash password if provided
	if password, ok := updateData["password"].(string); ok && password != "" {
		hashed, _ := utils.HashPassword(password)
		updateData["password"] = hashed
	}

	// Handle 0 values for dropdowns (not selected)
	if deptID, ok := updateData["department_id"].(float64); ok && deptID == 0 {
		updateData["department_id"] = nil
	}
	if posID, ok := updateData["position_id"].(float64); ok && posID == 0 {
		updateData["position_id"] = nil
	}

	if err := database.DB.Model(&user).Updates(updateData).Error; err != nil {
		internalUtils.Logger.Error("Failed to update user", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// OffboardUser performs an enterprise-grade employee separation.
// It deactivates the user, creates an ExitRecord, and calculates the final payout.
func OffboardUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	
	tx := database.DB.Begin()
	if err := tx.First(&user, id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Employee not found"})
		return
	}

	var input struct {
		ExitType models.ExitType `json:"exit_type" binding:"required"`
		Reason   string          `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Exit type and reason are required"})
		return
	}

	// 1. Calculate Payout (Leave Balance * Daily Rate)
	var salary models.SalaryConfiguration
	tx.Where("user_id = ?", user.ID).First(&salary)
	dailyRate := salary.BaseSalary / 22.0
	finalPayout := user.LeaveBalance * dailyRate

	// 2. Create Exit Record
	exit := models.ExitRecord{
		UserID:            user.ID,
		ExitType:          input.ExitType,
		LastWorkingDay:    time.Now(),
		FinalPayoutAmount: finalPayout,
		SettlementStatus:  "PENDING",
		Reason:            input.Reason,
	}
	if err := tx.Create(&exit).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create exit record"})
		return
	}

	// 3. Deactivate User
	now := time.Now()
	updates := map[string]interface{}{
		"is_active":          false,
		"deactivated_at":     &now,
		"termination_reason": input.Reason,
	}
	if err := tx.Model(&user).Updates(updates).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user status"})
		return
	}

	// 4. Audit Log
	adminID := c.GetUint("user_id")
	tx.Create(&models.AuditLog{
		UserID:    adminID,
		Action:    "TERMINATE_USER",
		Table:     "users",
		RecordID:  user.ID,
		NewValues: string(input.ExitType) + " | Settlement: " + string(rune(finalPayout)),
		CreatedAt: time.Now(),
	})

	tx.Commit()
	internalUtils.Logger.Info("Employee offboarded successfully", zap.Uint("user_id", user.ID), zap.Float64("payout", finalPayout))
	c.JSON(http.StatusOK, gin.H{
		"message":       "Employee successfully offboarded",
		"payout":        finalPayout,
		"exit_record":  exit,
	})
}

// DeleteUser performs a hard delete of a user record.
func DeleteUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User

	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if err := database.DB.Delete(&user).Error; err != nil {
		internalUtils.Logger.Error("Failed to delete user", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

func GenerateContract(c *gin.Context) {
	id := c.Param("id")
	var user models.User

	// Preload related data for contract
	if err := database.DB.Preload("Department").Preload("Position").First(&user, id).Error; err != nil {
		internalUtils.Logger.Error("User not found for contract", zap.String("id", id), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	pdfBytes, err := service.GenerateEmploymentContract(user)
	if err != nil {
		internalUtils.Logger.Error("Failed to generate contract", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate contract PDF"})
		return
	}

	fileName := fmt.Sprintf("Contract_%s_%s.pdf", user.FullName, time.Now().Format("2006-01-02"))
	
	c.Header("Content-Disposition", "attachment; filename="+fileName)
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Length", strconv.Itoa(len(pdfBytes)))
	c.Writer.Write(pdfBytes)
}
