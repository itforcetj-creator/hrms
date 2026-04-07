package handlers

import (
	"fmt"
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"hrms-backend/internal/service"
	"hrms-backend/internal/utils"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// Global reference for services in this MVP context
func getWorkflowService() *service.WorkflowService {
	return service.NewWorkflowService(database.DB)
}

func getUintFromContext(c *gin.Context, key string) (uint, bool) {
	raw, ok := c.Get(key)
	if !ok {
		return 0, false
	}

	switch value := raw.(type) {
	case uint:
		return value, true
	case int:
		if value < 0 {
			return 0, false
		}
		return uint(value), true
	case float64:
		if value < 0 {
			return 0, false
		}
		return uint(value), true
	default:
		return 0, false
	}
}

func getStringFromContext(c *gin.Context, key string) (string, bool) {
	raw, ok := c.Get(key)
	if !ok {
		return "", false
	}

	value, ok := raw.(string)
	if !ok {
		return "", false
	}
	return strings.TrimSpace(value), true
}

func normalizeDate(value time.Time) time.Time {
	year, month, day := value.Date()
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}

// GetLeaveBalance returns the current leave balance for the authenticated user
func GetLeaveBalance(c *gin.Context) {
	userID := c.GetUint("user_id")

	var user models.User
	if err := database.DB.Select("id", "full_name", "leave_balance", "hire_date").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Calculate used leave days this year
	currentYear := time.Now().Year()
	var usedDays float64
	database.DB.Model(&models.LeaveRequest{}).
		Where("user_id = ? AND status = ? AND EXTRACT(YEAR FROM start_date) = ?", userID, models.StatusApproved, currentYear).
		Select("COALESCE(SUM(days), 0)").
		Scan(&usedDays)

	c.JSON(http.StatusOK, gin.H{
		"user_id":         user.ID,
		"full_name":       user.FullName,
		"leave_balance":   user.LeaveBalance,
		"used_this_year":  usedDays,
		"total_accrued":   user.LeaveBalance + usedDays,
		"current_year":    currentYear,
		"monthly_accrual": 1.5,
	})
}

func calculateRequestedDays(startDate, endDate time.Time) float64 {
	return endDate.Sub(startDate).Hours()/24 + 1
}

func isValidLeaveType(leaveType string) bool {
	switch leaveType {
	case models.LeaveTypeVacation, models.LeaveTypeSick, models.LeaveTypeUnpaid, models.LeaveTypeMaternity:
		return true
	default:
		return false
	}
}

func isPaidLeaveType(leaveType string) bool {
	return leaveType != models.LeaveTypeUnpaid
}

func resolveDepartmentID(c *gin.Context, userID uint) (*uint, error) {
	if deptID, ok := getUintFromContext(c, "department_id"); ok {
		return &deptID, nil
	}

	var approver models.User
	if err := database.DB.Select("department_id").First(&approver, userID).Error; err != nil {
		return nil, err
	}
	return approver.DepartmentID, nil
}

// RequestLeave submits a leave request after business validation checks.
func RequestLeave(c *gin.Context) {
	// Standard input structure for leave requests.
	var input struct {
		Type      string    `json:"type" binding:"required"`
		StartDate time.Time `json:"start_date" binding:"required"`
		EndDate   time.Time `json:"end_date" binding:"required"`
		Reason    string    `json:"reason"`
	}

	// 1. Basic JSON structure and binding validation.
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data format. Ensure dates are ISO-8601 (e.g., YYYY-MM-DD)."})
		return
	}

	userID, ok := getUintFromContext(c, "user_id")
	if !ok || userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User context missing"})
		return
	}

	// 2. Business Logic Validation: Normalize dates to UTC 00:00:00 to avoid timezone shifts.
	startDate := normalizeDate(input.StartDate)
	endDate := normalizeDate(input.EndDate)
	today := normalizeDate(time.Now())

	// Prevent requesting leave in the past (unless Admin/HR, but here we enforce it for the MVP).
	if startDate.Before(today) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot request leave for past dates."})
		return
	}

	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End date must be after or equal to start date."})
		return
	}

	leaveType := strings.ToUpper(strings.TrimSpace(input.Type))
	if !isValidLeaveType(leaveType) {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid leave type: %s. Allowed: VACATION, SICK, UNPAID, MATERNITY.", leaveType)})
		return
	}

	requestedDays := calculateRequestedDays(startDate, endDate)

	// 3. User & Balance Validation.
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User record not found."})
		return
	}

	// Check if the user has enough accrued days for paid leave.
	if isPaidLeaveType(leaveType) && user.LeaveBalance < requestedDays {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":     "Insufficient leave balance",
			"requested": requestedDays,
			"available": user.LeaveBalance,
		})
		return
	}

	// 4. Overlap Detection Logic (Complex Logic):
	// A request overlaps if there's any pending/approved leave that:
	// - Starts BEFORE or ON the new request's END date
	// - Ends AFTER or ON the new request's START date
	var overlapCount int64
	if err := database.DB.Model(&models.LeaveRequest{}).
		Where("user_id = ?", userID).
		Where("status IN ?", []string{models.StatusPending, models.StatusApproved}).
		Where("start_date <= ? AND end_date >= ?", endDate, startDate).
		Count(&overlapCount).Error; err != nil {
		utils.Logger.Error("Failed to validate leave overlap", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Critical error during overlap validation."})
		return
	}

	if overlapCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "These dates overlap with an existing approved or pending request."})
		return
	}

	// 5. Database Persistence.
	leave := models.LeaveRequest{
		UserID:    userID,
		Type:      leaveType,
		StartDate: startDate,
		EndDate:   endDate,
		Days:      requestedDays,
		Status:    models.StatusPending, // All requests start as pending.
		Reason:    strings.TrimSpace(input.Reason),
	}

	if err := database.DB.Create(&leave).Error; err != nil {
		utils.Logger.Error("Failed to create leave request", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error: Failed to save request."})
		return
	}

	// 5.1. Initiate Approval Workflow.
	go func() {
		wfSvc := getWorkflowService()
		instance, err := wfSvc.InitiateWorkflow(models.WorkflowTypeLeave, leave.ID, userID)
		if err == nil {
			database.DB.Model(&leave).Update("workflow_instance_id", instance.ID)
		}
	}()

	// 6. External Notifications: Notify via Telegram and Email (non-blocking).
	go func() {
		notifySvc := utils.GetNotificationService()
		notifySvc.NotifyLeaveRequest(user.FullName, leaveType, requestedDays, startDate, endDate)
	}()

	utils.Logger.Info(
		"Leave request submitted successfully",
		zap.Uint("user_id", userID),
		zap.Float64("days", requestedDays),
	)
	c.JSON(http.StatusCreated, leave)
}

// GetLeaveRequests returns leave requests according to caller RBAC scope.
func GetLeaveRequests(c *gin.Context) {
	role, hasRole := getStringFromContext(c, "role")
	userID, hasUserID := getUintFromContext(c, "user_id")
	if !hasRole || !hasUserID || userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized user context"})
		return
	}

	query := database.DB.Model(&models.LeaveRequest{}).Preload("User").Order("start_date DESC")

	switch role {
	case models.RoleAdmin, models.RoleHR, models.RoleDirector:
		// HR/Admin/Director can view all leave requests.
	case models.RoleManager:
		deptID, err := resolveDepartmentID(c, userID)
		if err != nil {
			utils.Logger.Error("Failed to resolve manager department", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve department"})
			return
		}
		if deptID == nil || *deptID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Department is not configured for this manager"})
			return
		}
		query = query.
			Joins("JOIN users ON users.id = leave_requests.user_id").
			Where("users.department_id = ?", *deptID)
	default:
		// Employees can only view their own leave requests.
		query = query.Where("leave_requests.user_id = ?", userID)
	}

	// Pagination
	var total int64
	query.Count(&total)

	paginationParams := utils.PaginationParams{
		Page:     utils.ParseIntOrDefault(c.Query("page"), 1),
		PageSize: utils.ParseIntOrDefault(c.Query("page_size"), 20),
	}
	query = utils.ApplyPagination(paginationParams, query)

	var requests []models.LeaveRequest
	if err := query.Find(&requests).Error; err != nil {
		utils.Logger.Error("Failed to fetch leave requests", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch leave requests"})
		return
	}

	c.JSON(http.StatusOK, utils.PaginatedResponse{
		Data:     requests,
		Total:    total,
		Page:     paginationParams.Page,
		PageSize: paginationParams.PageSize,
	})
}

// ApproveLeave updates leave status and balance in one atomic DB transaction.
func ApproveLeave(c *gin.Context) {
	var input struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	approverID, hasApprover := getUintFromContext(c, "user_id")
	role, hasRole := getStringFromContext(c, "role")
	if !hasApprover || !hasRole || approverID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized user context"})
		return
	}

	newStatus := strings.ToUpper(strings.TrimSpace(input.Status))
	if newStatus != models.StatusApproved && newStatus != models.StatusRejected {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status must be APPROVED or REJECTED"})
		return
	}

	isAllowedApprover := role == models.RoleAdmin || role == models.RoleHR || role == models.RoleDirector || role == models.RoleManager
	if !isAllowedApprover {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to approve leave requests"})
		return
	}

	// Workflow-based Decision Logic:
	wfSvc := getWorkflowService()

	var leave models.LeaveRequest
	if err := database.DB.Preload("User").First(&leave, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Leave request not found"})
		return
	}

	if leave.WorkflowInstanceID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This request does not have an active workflow."})
		return
	}

	comments := c.Query("comments")
	err := wfSvc.ProcessStep(*leave.WorkflowInstanceID, approverID, newStatus, comments)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch updated workflow status
	var instance models.WorkflowInstance
	database.DB.First(&instance, *leave.WorkflowInstanceID)

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Handle Final Result
	if instance.Status == models.WorkflowStatusApproved {
		// Final Approval: Deduct balance and set final status
		if isPaidLeaveType(leave.Type) {
			result := tx.Model(&models.User{}).
				Where("id = ? AND leave_balance >= ?", leave.UserID, leave.Days).
				UpdateColumn("leave_balance", gorm.Expr("leave_balance - ?", leave.Days))
			if result.Error != nil || result.RowsAffected == 0 {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to deduct balance at final step"})
				return
			}
		}
		tx.Model(&leave).Updates(map[string]interface{}{
			"status":      models.StatusApproved,
			"approved_by": approverID,
		})
	} else if instance.Status == models.WorkflowStatusRejected {
		tx.Model(&leave).Update("status", models.StatusRejected)
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}

	action := "REJECT_LEAVE"
	if newStatus == models.StatusApproved {
		action = "APPROVE_LEAVE"
	}
	if err := tx.Create(&models.AuditLog{
		UserID:    approverID,
		Action:    action,
		Table:     "leave_requests",
		RecordID:  leave.ID,
		NewValues: "status=" + newStatus,
		Message:   "Leave request decision recorded",
		CreatedAt: time.Now(),
	}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write audit log"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize transaction"})
		return
	}

	leave.Status = newStatus
	leave.ApprovedBy = &approverID

	// Send email notification (non-blocking)
	go func() {
		var user models.User
		if err := database.DB.Select("email").First(&user, leave.UserID).Error; err == nil && user.Email != "" {
			emailSvc := utils.GetEmailService()
			startStr := leave.StartDate.Format("02 Jan 2006")
			endStr := leave.EndDate.Format("02 Jan 2006")
			if err := emailSvc.SendLeaveStatusEmail(user.Email, leave.Type, newStatus, startStr, endStr); err != nil {
				utils.Logger.Error("Failed to send leave status email", zap.Error(err))
			}
		}
	}()

	c.JSON(http.StatusOK, leave)
}
