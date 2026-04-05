package workers

import (
	"fmt"
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"time"
)

// StartPayrollWorker runs a background routine to generate payslips.
// In professional systems, this would run on the 25th of every month.
func StartPayrollWorker() {
	ticker := time.NewTicker(24 * time.Hour) // Check daily
	go func() {
		for range ticker.C {
			now := time.Now()
			// If today is the 25th of the month
			if now.Day() == 25 {
				processMonthlyPayroll()
			}
		}
	}()
}

func processMonthlyPayroll() {
	fmt.Println("Running Monthly Payroll Batch Processing...")

	var users []models.User
	database.DB.Where("is_active = ?", true).Find(&users)

	now := time.Now()
	for _, user := range users {
		var config models.SalaryConfiguration
		if err := database.DB.Where("user_id = ?", user.ID).First(&config).Error; err == nil {
			// Calculate net pay (Simple version: Base Salary)
			payslip := models.Payslip{
				UserID:      user.ID,
				Month:       int(now.Month()),
				Year:        now.Year(),
				NetAmount:   config.BaseSalary,
				Status:      models.PayslipStatusPaid,
				GeneratedAt: now,
			}
			database.DB.Create(&payslip)
		}
	}

	fmt.Printf("Processed payroll for %d users\n", len(users))
	
	// Audit Log
	log := models.AuditLog{
		Action:  "SYSTEM_PAYROLL",
		Message: fmt.Sprintf("Auto-generated monthly payslips for %d users", len(users)),
	}
	database.DB.Create(&log)
}
