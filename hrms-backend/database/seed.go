package database

import (
	"crypto/rand"
	"fmt"
	"hrms-backend/internal/models"
	"hrms-backend/utils"
	"math/big"
	"os"
	"time"
)

// Seed populates the database with initial mock data for testing purposes.
// It uses FirstOrCreate to prevent duplicate entries on subsequent runs.
func Seed() {
	// Skip seeding in production
	if os.Getenv("ALLOW_SEEDING") != "true" {
		fmt.Println("Seeding disabled. Set ALLOW_SEEDING=true to enable.")
		return
	}

	if DB == nil {
		fmt.Println("Database connection not initialized. Skipping seed.")
		return
	}

	fmt.Println("Seeding database with mock data...")

	// 1. Seed Departments
	departments := []models.Department{
		{Name: "Human Resources"},
		{Name: "Engineering"},
		{Name: "Sales"},
		{Name: "Operations"},
		{Name: "Marketing"},
		{Name: "Finance"},
	}

	for i := range departments {
		DB.Where(models.Department{Name: departments[i].Name}).FirstOrCreate(&departments[i])
	}

	// 2. Seed Positions
	positions := []models.Position{
		{Title: "HR Manager", DepartmentID: departments[0].ID, Grade: 8},
		{Title: "HR Coordinator", DepartmentID: departments[0].ID, Grade: 5},
		{Title: "Senior Engineer", DepartmentID: departments[1].ID, Grade: 9},
		{Title: "Junior Developer", DepartmentID: departments[1].ID, Grade: 5},
		{Title: "DevOps Engineer", DepartmentID: departments[1].ID, Grade: 7},
		{Title: "Sales Executive", DepartmentID: departments[2].ID, Grade: 6},
		{Title: "Sales Manager", DepartmentID: departments[2].ID, Grade: 8},
		{Title: "Operations Manager", DepartmentID: departments[3].ID, Grade: 8},
		{Title: "Marketing Specialist", DepartmentID: departments[4].ID, Grade: 6},
		{Title: "Financial Analyst", DepartmentID: departments[5].ID, Grade: 7},
	}

	for i := range positions {
		DB.Where(models.Position{Title: positions[i].Title}).FirstOrCreate(&positions[i])
	}

	// 3. Seed Users
	seedPassword := generateSeedPassword()
	hashedPassword, err := utils.HashPassword(seedPassword)
	if err != nil {
		fmt.Printf("Failed to hash seed password: %v\n", err)
		return
	}

	fmt.Printf("Seed password for all users: %s\n", seedPassword)

	users := []models.User{
		{
			Email:        "admin@hrms.com",
			Password:     hashedPassword,
			FullName:     "System Administrator",
			Role:         models.RoleAdmin,
			IsActive:     true,
			LeaveBalance: 30,
		},
		{
			Email:        "hr@hrms.com",
			Password:     hashedPassword,
			FullName:     "Sarah HR",
			Role:         models.RoleHR,
			DepartmentID: models.UintPtr(departments[0].ID),
			PositionID:   models.UintPtr(positions[0].ID),
			IsActive:     true,
			LeaveBalance: 25,
		},
		{
			Email:        "manager@hrms.com",
			Password:     hashedPassword,
			FullName:     "John Manager",
			Role:         models.RoleManager,
			DepartmentID: models.UintPtr(departments[1].ID),
			PositionID:   models.UintPtr(positions[1].ID),
			IsActive:     true,
			LeaveBalance: 22,
		},
		{
			Email:        "user@hrms.com",
			Password:     hashedPassword,
			FullName:     "David Developer",
			Role:         models.RoleEmployee,
			DepartmentID: models.UintPtr(departments[1].ID),
			PositionID:   models.UintPtr(positions[2].ID),
			IsActive:     true,
			LeaveBalance: 20,
		},
	}

	for i := range users {
		DB.Where(models.User{Email: users[i].Email}).FirstOrCreate(&users[i])

		// 4. Seed Salary Configuration for each user
		salary := models.SalaryConfiguration{
			UserID:           users[i].ID,
			BaseSalary:       5000.0 + float64(i*1000),
			Currency:         "USD",
			PaymentFrequency: "MONTHLY",
		}
		DB.Where(models.SalaryConfiguration{UserID: users[i].ID}).FirstOrCreate(&salary)
	}

	// 5. Seed some sample Attendance
	today := time.Now().Truncate(24 * time.Hour)
	for _, user := range users {
		clockIn := today.Add(9 * time.Hour)
		clockOut := today.Add(17 * time.Hour)
		attendance := models.Attendance{
			UserID:     user.ID,
			Date:       today,
			ClockIn:    &clockIn,
			ClockOut:   &clockOut,
			TotalHours: 8.0,
			Status:     models.StatusPresent,
			Location:   "127.0.0.1",
		}
		DB.Where(models.Attendance{UserID: user.ID, Date: today}).FirstOrCreate(&attendance)
	}

	// 6. Seed sample Leave Request
	leave := models.LeaveRequest{
		UserID:    users[3].ID, // David Developer
		Type:      "VACATION",
		StartDate: time.Now().AddDate(0, 0, 5),
		EndDate:   time.Now().AddDate(0, 0, 10),
		Reason:    "Family trip",
		Status:    models.StatusPending,
	}
	DB.Where(models.LeaveRequest{UserID: leave.UserID, Reason: leave.Reason}).FirstOrCreate(&leave)

	fmt.Println("Seeding completed successfully.")
}

// generateSeedPassword creates a cryptographically random password for seed users.
func generateSeedPassword() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	const length = 16
	password := make([]byte, length)
	for i := range password {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		password[i] = charset[n.Int64()]
	}
	return string(password)
}
