package workers

import (
	"fmt"
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"hrms-backend/internal/utils"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

// StartLeaveAccrualWorker checks once every 24 hours and applies monthly leave accrual
// on the 1st day of the month.
func StartLeaveAccrualWorker() {
	utils.Logger.Info("Starting Leave Accrual Worker")

	go func() {
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()

		var lastProcessedMonth string
		checkAndRun := func(now time.Time) {
			if now.Day() != 1 {
				return
			}

			currentMonth := now.Format("2006-01")
			if lastProcessedMonth == currentMonth {
				return
			}

			rows, err := accrueLeave()
			if err != nil {
				utils.Logger.Error("Leave accrual failed", zap.Error(err))
				fmt.Printf("Leave accrual failed on %s: %v\n", now.Format(time.RFC3339), err)
				return
			}

			lastProcessedMonth = currentMonth
			utils.Logger.Info("Leave accrual completed successfully", zap.Int64("users_affected", rows))
			fmt.Printf("Leave accrual completed on %s. Users affected: %d\n", now.Format(time.RFC3339), rows)
		}

		checkAndRun(time.Now())
		for range ticker.C {
			now := time.Now()
			checkAndRun(now)
		}
	}()
}

func accrueLeave() (int64, error) {
	utils.Logger.Info("Running monthly leave accrual process")

	tx := database.DB.Begin()
	if tx.Error != nil {
		return 0, tx.Error
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Increment balance by configured daily leave accrual rate for all active users
	result := tx.Model(&models.User{}).
		Where("is_active = ?", true).
		Update("leave_balance", gorm.Expr("leave_balance + ?", models.DailyLeaveAccrualRate))

	if result.Error != nil {
		tx.Rollback()
		return 0, result.Error
	}

	// Record systemic audit log
	if err := tx.Create(&models.AuditLog{
		UserID:    0, // System user
		Action:    "ACCRUE_LEAVE_SYSTEM",
		Table:     "users",
		RecordID:  0,
		NewValues: fmt.Sprintf("leave_balance = leave_balance + %.1f", models.DailyLeaveAccrualRate),
		Message:   fmt.Sprintf("Monthly leave accrual (+%.1f days) applied to all active employees.", models.DailyLeaveAccrualRate),
		CreatedAt: time.Now(),
	}).Error; err != nil {
		tx.Rollback()
		return 0, err
	}

	if err := tx.Commit().Error; err != nil {
		return 0, err
	}
	return result.RowsAffected, nil
}
