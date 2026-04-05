package handlers

import (
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"hrms-backend/internal/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// GenerateMonthlyPayslips processes monthly earnings with LWOP deductions.
func GenerateMonthlyPayslips(c *gin.Context) {
	var input struct {
		Month int `json:"month" binding:"required"`
		Year  int `json:"year" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Month and Year are required"})
		return
	}

	tx := database.DB.Begin()
	var users []models.User
	if err := tx.Where("is_active = ?", true).Find(&users).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active users"})
		return
	}

	for _, user := range users {
		var salary models.SalaryConfiguration
		if err := tx.Where("user_id = ?", user.ID).First(&salary).Error; err != nil {
			continue 
		}

		// LWOP Deductions logic (Sprint 2 Requirement)
		var unpaidLeaveDays float64
		month_start := time.Date(input.Year, time.Month(input.Month), 1, 0, 0, 0, 0, time.UTC)
		month_end := month_start.AddDate(0, 1, -1)

		tx.Model(&models.LeaveRequest{}).
			Where("user_id = ? AND status = ? AND type = ? AND start_date >= ? AND end_date <= ?", 
				user.ID, models.StatusApproved, "Unpaid", month_start, month_end).
			Select("COALESCE(SUM(EXTRACT(DAY FROM end_date - start_date) + 1), 0)").
			Scan(&unpaidLeaveDays)

		// 3. Bonus and Penalties logic
		var totalBonus, totalPenalty float64
		tx.Model(&models.BonusPenalty{}).
			Where("user_id = ? AND month = ? AND year = ? AND type = ?", user.ID, input.Month, input.Year, models.TypeBonus).
			Select("COALESCE(SUM(amount), 0)").Scan(&totalBonus)

		tx.Model(&models.BonusPenalty{}).
			Where("user_id = ? AND month = ? AND year = ? AND type = ?", user.ID, input.Month, input.Year, models.TypePenalty).
			Select("COALESCE(SUM(amount), 0)").Scan(&totalPenalty)

		dailyRate := salary.BaseSalary / 22.0
		deduction := unpaidLeaveDays * dailyRate
		netAmount := salary.BaseSalary + totalBonus - totalPenalty - deduction

		payslip := models.Payslip{
			UserID:        user.ID,
			Month:         input.Month,
			Year:          input.Year,
			NetAmount:     netAmount,
			BonusAmount:   totalBonus,
			PenaltyAmount: totalPenalty,
			Status:        models.PayslipStatusPending,
			GeneratedAt:   time.Now(),
		}

		if err := tx.Create(&payslip).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate payslip for " + user.Email})
			return
		}
	}

	tx.Commit()
	c.JSON(http.StatusCreated, gin.H{"message": "Monthly payslips generated successfully with LWOP corrections"})
}

// ManageSalaries configures base pay, encrypts sensitive data, and records history.
func ManageSalaries(c *gin.Context) {
	var input struct {
		UserID          uint    `json:"user_id" binding:"required"`
		BaseSalary      float64 `json:"base_salary" binding:"required"`
		Currency        string  `json:"currency"`
		BankName        string  `json:"bank_name"`
		AccountNumber   string  `json:"account_number"`
		TaxID           string  `json:"tax_id"`
		Reason          string  `json:"reason"` // To explain the salary change
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid salary input"})
		return
	}

	adminID := c.GetUint("user_id")
	tx := database.DB.Begin()

	// 1. Encrypt Sensitive Fields
	encryptedAccount, _ := utils.Encrypt(input.AccountNumber)
	encryptedTax, _ := utils.Encrypt(input.TaxID)

	// 2. Fetch Current Configuration (to compare and audit)
	var currentConf models.SalaryConfiguration
	tx.Where("user_id = ?", input.UserID).First(&currentConf)

	// 3. Save New Configuration
	newConfig := models.SalaryConfiguration{
		UserID:           input.UserID,
		BaseSalary:       input.BaseSalary,
		Currency:         input.Currency,
		BankName:         input.BankName,
		AccountNumber:    encryptedAccount,
		TaxID:            encryptedTax,
		PaymentFrequency: "MONTHLY",
	}

	if err := tx.Where("user_id = ?", input.UserID).Save(&newConfig).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update salary config"})
		return
	}

	// 4. Record Audit: Salary History
	history := models.SalaryHistory{
		UserID:    input.UserID,
		OldSalary: currentConf.BaseSalary,
		NewSalary: input.BaseSalary,
		Reason:    input.Reason,
		ChangedBy: adminID,
		CreatedAt: time.Now(),
	}
	if err := tx.Create(&history).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record salary history"})
		return
	}

	// 5. System Audit Log (Strict Rule)
	tx.Create(&models.AuditLog{
		UserID:    adminID,
		Action:    "MANAGE_SALARY",
		Table:     "salary_configurations",
		RecordID:  input.UserID,
		NewValues: "Base salary updated to " + string(rune(input.BaseSalary)),
		CreatedAt: time.Now(),
	})

	tx.Commit()
	utils.Logger.Info("Salary management completed successfully", zap.Uint("user_id", input.UserID))
	c.JSON(http.StatusOK, gin.H{"message": "Salary configuration updated, encrypted, and historized successfully"})
}

func GetMyPayslips(c *gin.Context) {
	userID := c.GetUint("user_id")
	var payslips []models.Payslip
	if err := database.DB.Where("user_id = ?", userID).Order("year desc, month desc").Find(&payslips).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payslips"})
		return
	}
	c.JSON(http.StatusOK, payslips)
}
