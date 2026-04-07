package handlers

import (
	"fmt"
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"hrms-backend/internal/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"go.uber.org/zap"
)

// ExportPayrollExcel generates a downloadable Excel report for a specific payroll period.
func ExportPayrollExcel(c *gin.Context) {
	month := utils.ParseIntOrDefault(c.Query("month"), int(time.Now().Month()))
	year := utils.ParseIntOrDefault(c.Query("year"), time.Now().Year())

	var payslips []models.Payslip
	if err := database.DB.Preload("User.Department").
		Where("month = ? AND year = ?", month, year).
		Find(&payslips).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payroll data."})
		return
	}

	f := excelize.NewFile()
	sheet := "Payroll Report"
	f.SetSheetName("Sheet1", sheet)

	// Define headers
	headers := []string{"Employee ID", "Full Name", "Department", "Base Salary", "Bonus", "Penalty", "Net Amount", "Status"}
	for i, head := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, head)
	}

	// Apply styles to headers
	style, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"4F81BD"}, Pattern: 1},
	})
	f.SetCellStyle(sheet, "A1", "H1", style)

	// Fill data
	for i, p := range payslips {
		row := i + 2
		deptName := "N/A"
		if p.User.Department.Name != "" {
			deptName = p.User.Department.Name
		}

		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), p.UserID)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), p.User.FullName)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), deptName)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), p.NetAmount-p.BonusAmount+p.PenaltyAmount) // Base (approx)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), p.BonusAmount)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), p.PenaltyAmount)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), p.NetAmount)
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), string(p.Status))
	}

	// Set column widths
	f.SetColWidth(sheet, "A", "A", 12)
	f.SetColWidth(sheet, "B", "B", 25)
	f.SetColWidth(sheet, "C", "C", 20)
	f.SetColWidth(sheet, "D", "G", 15)

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=payroll_%d_%d.xlsx", month, year))

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate Excel file."})
	}
}

// GenerateMonthlyPayslips processes monthly earnings with LWOP deductions.
// Uses batch queries instead of N+1 loop for performance.
// GenerateMonthlyPayslips processes monthly earnings with LWOP (Leave Without Pay) deductions.
// It performs batch calculations to avoid N+1 database queries.
func GenerateMonthlyPayslips(c *gin.Context) {
	var input struct {
		Month int `json:"month" binding:"required"`
		Year  int `json:"year" binding:"required"`
	}

	// 1. Input Validation.
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Month and Year are required."})
		return
	}

	if input.Month < 1 || input.Month > 12 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid month. Must be between 1 and 12."})
		return
	}

	currentYear := time.Now().Year()
	if input.Year < currentYear-5 || input.Year > currentYear+1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid year. Must be between %d and %d.", currentYear-5, currentYear+1)})
		return
	}

	tx := database.DB.Begin()

	// 2. Data Fetching Phase: Process all active users.
	var users []models.User
	if err := tx.Where("is_active = ?", true).Find(&users).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active users database."})
		return
	}

	if len(users) == 0 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "No active employees found in the system."})
		return
	}

	userIDs := make([]uint, len(users))
	userMap := make(map[uint]models.User)
	for i, u := range users {
		userIDs[i] = u.ID
		userMap[u.ID] = u
	}

	// Batch fetch salary configurations to avoid repeated DB hits inside the loop.
	var salaries []models.SalaryConfiguration
	if err := tx.Where("user_id IN ?", userIDs).Find(&salaries).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch salary configurations."})
		return
	}
	salaryMap := make(map[uint]models.SalaryConfiguration)
	for _, s := range salaries {
		salaryMap[s.UserID] = s
	}

	// 3. Deduction Calculation Logic (Complex Logic):
	// Calculate LWOP (Leave Without Pay) by summing approved "Unpaid" leave days for this period.
	monthStart := time.Date(input.Year, time.Month(input.Month), 1, 0, 0, 0, 0, time.UTC)
	monthEnd := monthStart.AddDate(0, 1, -1)

	type LeaveAgg struct {
		UserID     uint    `json:"user_id"`
		UnpaidDays float64 `json:"unpaid_days"`
	}
	var leaveAggs []LeaveAgg
	tx.Model(&models.LeaveRequest{}).
		Select("user_id, COALESCE(SUM(days), 0) as unpaid_days").
		Where("user_id IN ? AND status = ? AND type = ? AND start_date >= ? AND end_date <= ?",
			userIDs, models.StatusApproved, models.LeaveTypeUnpaid, monthStart, monthEnd).
		Group("user_id").
		Scan(&leaveAggs)

	unpaidLeaveMap := make(map[uint]float64)
	for _, la := range leaveAggs {
		unpaidLeaveMap[la.UserID] = la.UnpaidDays
	}

	// 4. Batch fetch Bonuses and Penalties.
	type BonusAgg struct {
		UserID uint    `json:"user_id"`
		Amount float64 `json:"amount"`
	}
	var bonusAggs []BonusAgg
	tx.Model(&models.BonusPenalty{}).
		Select("user_id, COALESCE(SUM(amount), 0) as amount").
		Where("user_id IN ? AND month = ? AND year = ? AND type = ?",
			userIDs, input.Month, input.Year, models.TypeBonus).
		Group("user_id").
		Scan(&bonusAggs)

	bonusMap := make(map[uint]float64)
	for _, b := range bonusAggs {
		bonusMap[b.UserID] = b.Amount
	}

	var penaltyAggs []BonusAgg
	tx.Model(&models.BonusPenalty{}).
		Select("user_id, COALESCE(SUM(amount), 0) as amount").
		Where("user_id IN ? AND month = ? AND year = ? AND type = ?",
			userIDs, input.Month, input.Year, models.TypePenalty).
		Group("user_id").
		Scan(&penaltyAggs)

	penaltyMap := make(map[uint]float64)
	for _, p := range penaltyAggs {
		penaltyMap[p.UserID] = p.Amount
	}

	// 5. Duplicate Prevention.
	var existingCount int64
	tx.Model(&models.Payslip{}).
		Where("month = ? AND year = ?", input.Month, input.Year).
		Count(&existingCount)

	if existingCount > 0 {
		tx.Rollback()
		c.JSON(http.StatusConflict, gin.H{"error": "Payslips for this period already exist. Use 'Regenerate' or 'Delete' first."})
		return
	}

	// 6. Bulk Generation Loop.
	var payslips []models.Payslip
	generatedAt := time.Now()
	skippedCount := 0

	for _, userID := range userIDs {
		salary, ok := salaryMap[userID]
		if !ok {
			skippedCount++
			continue
		}

		unpaidDays := unpaidLeaveMap[userID]
		totalBonus := bonusMap[userID]
		totalPenalty := penaltyMap[userID]

		// Final Math: Net = Base + Bonus - Penalty - (Unpaid Days * Daily Rate)
		// Assumption: 22 working days per month for daily rate calculation.
		dailyRate := salary.BaseSalary / 22.0
		deduction := unpaidDays * dailyRate
		netAmount := salary.BaseSalary + totalBonus - totalPenalty - deduction

		payslips = append(payslips, models.Payslip{
			UserID:        userID,
			Month:         input.Month,
			Year:          input.Year,
			NetAmount:     netAmount,
			BonusAmount:   totalBonus,
			PenaltyAmount: totalPenalty,
			Status:        models.PayslipStatusPending,
			GeneratedAt:   generatedAt,
		})
	}

	if len(payslips) > 0 {
		if err := tx.Create(&payslips).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to bulk insert payslips into the database."})
			return
		}
	}

	tx.Commit()

	// 7. Notification Sync.
	go func() {
		tgMsg := fmt.Sprintf("💰 <b>Payroll Batch Generated</b>\n\nPeriod: %02d/%d\nGenerated: %d payslips\nSkipped: %d (missing salary config)", 
			input.Month, input.Year, len(payslips), skippedCount)
		utils.GetNotificationService().SendTelegram(tgMsg)
	}()

	c.JSON(http.StatusCreated, gin.H{
		"message":       "Payroll batch processing completed.",
		"created_count": len(payslips),
		"skipped_count": skippedCount,
	})
}

// ManageSalaries configures base pay, encrypts sensitive data, and records history for audits.
func ManageSalaries(c *gin.Context) {
	var input struct {
		UserID        uint    `json:"user_id" binding:"required"`
		BaseSalary    float64 `json:"base_salary" binding:"required"`
		Currency      string  `json:"currency"`
		BankName      string  `json:"bank_name"`
		AccountNumber string  `json:"account_number"`
		TaxID         string  `json:"tax_id"`
		Reason        string  `json:"reason"` // Auditable reason for change
	}

	// 1. Validation.
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Required fields: UserID, BaseSalary. Ensure salary is a positive number."})
		return
	}

	if input.BaseSalary < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Base salary cannot be negative."})
		return
	}

	adminID := c.GetUint("user_id")
	tx := database.DB.Begin()

	// 2. Encryption (Complex Logic): Security of financial data.
	encryptedAccount, err := utils.Encrypt(input.AccountNumber)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Encryption phase failed."})
		return
	}
	encryptedTax, err := utils.Encrypt(input.TaxID)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Encryption phase failed."})
		return
	}

	var currentConf models.SalaryConfiguration
	tx.Where("user_id = ?", input.UserID).First(&currentConf)

	// 3. Persistence.
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to apply salary updates."})
		return
	}

	// 4. Audit History (Vital for HR Compliance).
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to persist auditable history."})
		return
	}
	// 5. System Audit Log (Strict Rule)
	if err := tx.Create(&models.AuditLog{
		UserID:    adminID,
		Action:    "MANAGE_SALARY",
		Table:     "salary_configurations",
		RecordID:  input.UserID,
		NewValues: fmt.Sprintf("Base salary updated to %.2f", input.BaseSalary),
		CreatedAt: time.Now(),
	}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to log audit data."})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction commit failed."})
		return
	}

	utils.Logger.Info("Salary management completed successfully", zap.Uint("user_id", input.UserID))
	c.JSON(http.StatusOK, gin.H{"message": "Salary configuration updated, encrypted, and historized successfully"})
}

func GetMyPayslips(c *gin.Context) {
	userID := c.GetUint("user_id")

	// Pagination
	var total int64
	database.DB.Model(&models.Payslip{}).Where("user_id = ?", userID).Count(&total)

	paginationParams := utils.PaginationParams{
		Page:     utils.ParseIntOrDefault(c.Query("page"), 1),
		PageSize: utils.ParseIntOrDefault(c.Query("page_size"), 20),
	}
	query := utils.ApplyPagination(paginationParams, database.DB)

	var payslips []models.Payslip
	if err := query.Where("user_id = ?", userID).Order("year desc, month desc").Find(&payslips).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payslips"})
		return
	}
	c.JSON(http.StatusOK, utils.PaginatedResponse{
		Data:     payslips,
		Total:    total,
		Page:     paginationParams.Page,
		PageSize: paginationParams.PageSize,
	})
}
