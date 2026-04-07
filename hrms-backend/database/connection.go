package database

import (
	"fmt"

	"hrms-backend/internal/config"
	"hrms-backend/internal/models"
	"hrms-backend/internal/utils"

	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	cfg := config.AppConfig
	if cfg == nil {
		config.Load()
		cfg = config.AppConfig
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort, cfg.DBSSLMode)
	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		utils.Logger.Fatal("Failed to connect to database!", zap.Error(err))
	}

	// Data cleanup: Set invalid initial IDs to NULL to avoid migration foreign key constraint errors
	// This is safe because DepartmentID and PositionID are now pointers (*uint)
	database.Exec("UPDATE users SET department_id = NULL WHERE department_id = 0")
	database.Exec("UPDATE users SET position_id = NULL WHERE position_id = 0")

	// Order of migration matters for initial Foreign Key check
	database.AutoMigrate(&models.Department{})
	database.AutoMigrate(&models.Position{})
	database.AutoMigrate(&models.User{})
	database.AutoMigrate(&models.Document{})
	database.AutoMigrate(&models.JobOpening{})
	database.AutoMigrate(&models.Candidate{})
	database.AutoMigrate(&models.InterviewNote{})
	database.AutoMigrate(&models.LeaveRequest{})
	database.AutoMigrate(&models.Attendance{})
	database.AutoMigrate(&models.SalaryConfiguration{})
	database.AutoMigrate(&models.Payslip{})
	database.AutoMigrate(&models.AuditLog{})
	database.AutoMigrate(&models.SalaryHistory{})
	database.AutoMigrate(&models.ReviewCycle{})
	database.AutoMigrate(&models.PerformanceReview{})
	database.AutoMigrate(&models.Goal{})
	database.AutoMigrate(&models.KeyResult{})
	database.AutoMigrate(&models.Announcement{})
	database.AutoMigrate(&models.Notification{})
	database.AutoMigrate(&models.Asset{})      // Asset Management
	database.AutoMigrate(&models.ExitRecord{}) // Offboarding
	database.AutoMigrate(&models.BonusPenalty{})

	DB = database
	utils.Logger.Info("Database connection established and full migration completed successfully")
}
