package handlers

import (
	"hrms-backend/database"
	"hrms-backend/internal/models"
	internalUtils "hrms-backend/internal/utils"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// ClockIn records the start of a workday for an employee.
// It creates a new attendance record for the current date.
func ClockIn(c *gin.Context) {
	userID := c.GetUint("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User identity not found in context"})
		return
	}
	now := time.Now()
	date := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	var existing models.Attendance
	if err := database.DB.Where("user_id = ? AND date = ?", userID, date).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Already clocked in for today"})
		return
	}

	attendance := models.Attendance{
		UserID:   userID,
		Date:     date,
		ClockIn:  &now,
		Status:   models.StatusPresent,
		Location: c.ClientIP(),
	}

	if err := database.DB.Create(&attendance).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record Clock-In"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Clock-In successful", "time": now})
}

// ClockOut records the end of a workday and calculates total working hours.
func ClockOut(c *gin.Context) {
	userID := c.GetUint("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User identity not found in context"})
		return
	}
	now := time.Now()
	date := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	var attendance models.Attendance
	if err := database.DB.Where("user_id = ? AND date = ?", userID, date).First(&attendance).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No Clock-In record found for today"})
		return
	}

	if attendance.ClockOut != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Already clocked out for today"})
		return
	}

	duration := now.Sub(*attendance.ClockIn).Hours()
	attendance.ClockOut = &now
	attendance.TotalHours = duration

	if err := database.DB.Save(&attendance).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record Clock-Out"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Clock-Out successful", "total_hours": duration})
}

// GetAttendanceReports provides HR and Admin with daily attendance insights.
func GetAttendanceReports(c *gin.Context) {
	var reports []models.Attendance

	// Pagination
	var total int64
	database.DB.Model(&models.Attendance{}).Count(&total)

	paginationParams := internalUtils.PaginationParams{
		Page:     internalUtils.ParseIntOrDefault(c.Query("page"), 1),
		PageSize: internalUtils.ParseIntOrDefault(c.Query("page_size"), 20),
	}
	query := internalUtils.ApplyPagination(paginationParams, database.DB)

	if err := query.Preload("User").Order("date desc, clock_in desc").Find(&reports).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch attendance reports"})
		return
	}
	c.JSON(http.StatusOK, internalUtils.PaginatedResponse{
		Data:     reports,
		Total:    total,
		Page:     paginationParams.Page,
		PageSize: paginationParams.PageSize,
	})
}

// GetDepartmentAttendanceMatrix returns a month's attendance matrix for a department.
// Query params: month (1-12), year (e.g. 2026), department_id (optional for ADMIN/HR).
// A DEPARTMENT_HEAD will automatically be scoped to their own department.
func GetDepartmentAttendanceMatrix(c *gin.Context) {
	callerID := c.GetUint("user_id")

	// Parse month/year (default to current)
	now := time.Now()
	month := int(now.Month())
	year := now.Year()
	if m, err := strconv.Atoi(c.Query("month")); err == nil && m >= 1 && m <= 12 {
		month = m
	}
	if y, err := strconv.Atoi(c.Query("year")); err == nil && y > 2000 {
		year = y
	}

	// Resolve department scope
	deptID := uint(0)
	var caller models.User
	if err := database.DB.First(&caller, callerID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Caller not found"})
		return
	}

	if caller.Role == models.RoleManager {
		// Department Head: scoped to their own department
		if caller.DepartmentID == nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not assigned to a department"})
			return
		}
		deptID = *caller.DepartmentID
	} else {
		// ADMIN / HR: may pass department_id filter
		if did, err := strconv.Atoi(c.Query("department_id")); err == nil && did > 0 {
			deptID = uint(did)
		}
	}

	// Fetch department employees
	var employees []models.User
	query := database.DB.Preload("Department").Preload("Position")
	if deptID > 0 {
		query = query.Where("department_id = ? AND is_active = true", deptID)
	} else {
		query = query.Where("is_active = true")
	}
	if err := query.Find(&employees).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch employees"})
		return
	}

	// Date range for the month
	firstDay := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	daysInMonth := daysInMonthCount(year, month)
	lastDay := time.Date(year, time.Month(month), daysInMonth, 23, 59, 59, 0, time.UTC)

	// Collect user IDs
	userIDs := make([]uint, 0, len(employees))
	for _, e := range employees {
		userIDs = append(userIDs, e.ID)
	}

	// Fetch all attendance records for this month
	var records []models.Attendance
	if len(userIDs) > 0 {
		if err := database.DB.Where("user_id IN ? AND date >= ? AND date <= ?", userIDs, firstDay, lastDay).
			Find(&records).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch attendance"})
			return
		}
	}

	// Build a lookup: map[userID][day] = status
	lookup := make(map[uint]map[int]string)
	for _, r := range records {
		uid := r.UserID
		day := r.Date.Day()
		if lookup[uid] == nil {
			lookup[uid] = make(map[int]string)
		}
		lookup[uid][day] = string(r.Status)
	}

	// Compose response rows
	type EmployeeRow struct {
		ID         uint              `json:"id"`
		FullName   string            `json:"full_name"`
		Role       string            `json:"role"`
		Department string            `json:"department"`
		Days       map[string]string `json:"days"` // "1" -> "PRESENT" | "" (absent)
	}

	rows := make([]EmployeeRow, 0, len(employees))
	for _, emp := range employees {
		deptName := ""
		if emp.DepartmentID != nil {
			deptName = emp.Department.Name
		}
		days := make(map[string]string)
		for d := 1; d <= daysInMonth; d++ {
			key := strconv.Itoa(d)
			days[key] = lookup[emp.ID][d]
		}
		rows = append(rows, EmployeeRow{
			ID:         emp.ID,
			FullName:   emp.FullName,
			Role:       emp.Role,
			Department: deptName,
			Days:       days,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"month":         month,
		"year":          year,
		"days_in_month": daysInMonth,
		"employees":     rows,
	})
}

// MarkAttendance lets a department head (or HR/Admin) mark an employee present or absent for a date.
// Body: { user_id, date "YYYY-MM-DD", status "PRESENT"|"ABSENT"|"LATE"|"ON_LEAVE" }
func MarkAttendance(c *gin.Context) {
	callerID := c.GetUint("user_id")

	var input struct {
		UserID uint   `json:"user_id" binding:"required"`
		Date   string `json:"date" binding:"required"` // "YYYY-MM-DD"
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id, date, and status are required"})
		return
	}

	// Parse date
	parsedDate, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, use YYYY-MM-DD"})
		return
	}

	// Validate status
	validStatuses := map[string]bool{
		"PRESENT":  true,
		"ABSENT":   true,
		"LATE":     true,
		"ON_LEAVE": true,
	}
	if !validStatuses[input.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	// DEPARTMENT_HEAD scope check: ensure target employee is in their department
	var caller models.User
	database.DB.First(&caller, callerID)
	if caller.Role == models.RoleManager {
		var target models.User
		if err := database.DB.First(&target, input.UserID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Employee not found"})
			return
		}
		if caller.DepartmentID == nil || target.DepartmentID == nil ||
			*caller.DepartmentID != *target.DepartmentID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Employee is not in your department"})
			return
		}
	}

	dateOnly := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 0, 0, 0, 0, time.UTC)

	// Upsert: update if exists else create
	var att models.Attendance
	result := database.DB.Where("user_id = ? AND date = ?", input.UserID, dateOnly).First(&att)
	if result.Error != nil {
		// Create new record
		att = models.Attendance{
			UserID: input.UserID,
			Date:   dateOnly,
			Status: models.AttendanceStatus(input.Status),
		}
		if err := database.DB.Create(&att).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create attendance record"})
			return
		}
	} else {
		// Update existing
		att.Status = models.AttendanceStatus(input.Status)
		if err := database.DB.Save(&att).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update attendance record"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Attendance marked", "record": att})
}

// UnmarkAttendance removes a present mark (sets to ABSENT / deletes the record).
func UnmarkAttendance(c *gin.Context) {
	callerID := c.GetUint("user_id")

	var input struct {
		UserID uint   `json:"user_id" binding:"required"`
		Date   string `json:"date" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id and date are required"})
		return
	}

	parsedDate, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	// DEPARTMENT_HEAD scope check
	var caller models.User
	database.DB.First(&caller, callerID)
	if caller.Role == models.RoleManager {
		var target models.User
		if err := database.DB.First(&target, input.UserID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Employee not found"})
			return
		}
		if caller.DepartmentID == nil || target.DepartmentID == nil ||
			*caller.DepartmentID != *target.DepartmentID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Employee is not in your department"})
			return
		}
	}

	dateOnly := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 0, 0, 0, 0, time.UTC)
	database.DB.Where("user_id = ? AND date = ?", input.UserID, dateOnly).
		Model(&models.Attendance{}).Update("status", "ABSENT")

	c.JSON(http.StatusOK, gin.H{"message": "Attendance unmarked"})
}

func daysInMonthCount(year, month int) int {
	return time.Date(year, time.Month(month+1), 0, 0, 0, 0, 0, time.UTC).Day()
}
