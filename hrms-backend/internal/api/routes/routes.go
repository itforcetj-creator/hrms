package routes

import (
	"hrms-backend/internal/api/middleware"
	"hrms-backend/internal/handlers"
	"hrms-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// SetupRoutes centralizes all API route definitions and applies global middleware.
func SetupRoutes(r *gin.Engine) {
	// Global Middleware
	r.Use(middleware.AuditMiddleware())

	// Public Routes
	r.POST("/login", handlers.Login)
	r.POST("/public/apply", handlers.ApplyForJob)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "OK"})
	})

	// 1. Employee Self-Service (Authenticated)
	authGroup := r.Group("/api/v1")
	authGroup.Use(middleware.AuthorizeRole("ADMIN", "HR", "USER", "DEPARTMENT_HEAD", "DIRECTOR"))
	{
		authGroup.GET("/me", handlers.GetMe)
		authGroup.PATCH("/me", handlers.UpdateMe)
		// Documents
		authGroup.POST("/documents/upload", handlers.UploadDocument)
		authGroup.GET("/documents", handlers.GetMyDocuments)
		authGroup.GET("/documents/:id", handlers.DownloadDocument)
		authGroup.DELETE("/documents/:id", handlers.DeleteDocument)

		// Leave
		authGroup.POST("/leave/request", handlers.RequestLeave)
		authGroup.GET("/leave/requests", handlers.GetLeaveRequests)
		authGroup.PATCH("/leave/approve/:id", handlers.ApproveLeave)

		// Attendance
		authGroup.POST("/attendance/clock-in", handlers.ClockIn)
		authGroup.POST("/attendance/clock-out", handlers.ClockOut)

		// Assets (Self)
		authGroup.GET("/assets/my", handlers.GetMyAssets)

		// Recruitment (Self/Employee)
		authGroup.GET("/recruitment/jobs", handlers.GetJobOpenings)
		authGroup.GET("/departments", handlers.GetDepartments)
		authGroup.GET("/positions", handlers.GetPositions)

		// Payroll (Self)
		authGroup.GET("/payroll/payslips", handlers.GetMyPayslips)

		// Performance & Goals
		authGroup.POST("/performance/goals", handlers.CreateGoal)
		authGroup.GET("/performance/goals", handlers.GetMyGoals)

		// Notifications
		authGroup.GET("/notifications", handlers.GetMyNotifications)
		authGroup.PATCH("/notifications/:id/read", handlers.MarkNotificationRead)
		authGroup.PATCH("/notifications/read-all", handlers.MarkAllNotificationsRead)

		// Announcements
		authGroup.GET("/announcements", handlers.GetAnnouncements)
	}

	// 2. Admin System Panel (SysAdmin only)
	adminRoutes := r.Group("/admin")
	adminRoutes.Use(middleware.AuthorizePermission(models.PermissionSystemSettings))
	{
		adminRoutes.GET("/dashboard", func(c *gin.Context) {
			c.JSON(200, gin.H{"message": "Welcome to the Secure Admin Panel"})
		})
	}

	// 3. Admin v1 Base Group
	adminV1 := r.Group("/admin/v1")

	// 3.1 Attendance & Team Matrix (Shared: HR, Admin, Managers)
	attendanceMatrix := adminV1.Group("/attendance")
	attendanceMatrix.Use(middleware.AuthorizePermission(models.PermissionViewAttendance))
	{
		attendanceMatrix.GET("/department", handlers.GetDepartmentAttendanceMatrix)
		attendanceMatrix.POST("/mark", handlers.MarkAttendance)
		attendanceMatrix.POST("/unmark", handlers.UnmarkAttendance)
	}

	// 3.2 HR & Payroll Operations (Strict: HR, Admin only)
	hrOps := adminV1.Group("/")
	hrOps.Use(middleware.AuthorizePermission(models.PermissionManagePayroll))
	{
		// Audit Logs
		hrOps.GET("/audit/logs", handlers.GetAuditLogs)

		// Asset Management
		hrOps.GET("/assets", handlers.GetAllAssets)
		hrOps.POST("/assets", handlers.CreateAsset)
		hrOps.PATCH("/assets/:id", handlers.UpdateAsset)
		hrOps.DELETE("/assets/:id", handlers.DeleteAsset)
		hrOps.POST("/assets/assign", handlers.AssignAsset)
		hrOps.POST("/assets/:id/unassign", handlers.UnassignAsset)

		// Recruitment
		hrOps.POST("/recruitment/jobs", handlers.CreateJobOpening)
		hrOps.GET("/recruitment/jobs/:id", handlers.GetJobOpeningDetails)
		hrOps.PATCH("/recruitment/jobs/:id", handlers.UpdateJobOpening)
		hrOps.DELETE("/recruitment/jobs/:id", handlers.DeleteJobOpening)
		hrOps.GET("/recruitment/jobs/:id/candidates", handlers.GetCandidatesByJob)
		hrOps.PATCH("/recruitment/candidates/:id/status", handlers.UpdateCandidateStatus)
		hrOps.GET("/recruitment/candidates/:id/notes", handlers.GetInterviewNotes)
		hrOps.POST("/recruitment/candidates/:id/notes", handlers.PostInterviewNote)
		hrOps.POST("/recruitment/hire/:id", handlers.FinalizeHire)

		// Users & Employees
		hrOps.POST("/users", handlers.CreateUser)
		hrOps.GET("/users", handlers.GetEmployeeDirectory)
		hrOps.GET("/users/:id", handlers.GetEmployeeProfile)
		hrOps.PATCH("/users/:id", handlers.UpdateUser)
		hrOps.DELETE("/users/:id", handlers.DeleteUser)
		hrOps.POST("/users/:id/offboard", handlers.OffboardUser)
		hrOps.GET("/users/:id/contract", handlers.GenerateContract)
		hrOps.GET("/documents", handlers.GetDocumentsByUsers)
		hrOps.GET("/documents/:id/download", handlers.DownloadDocument)

		// Company Structure
		hrOps.POST("/departments", handlers.CreateDepartment)
		hrOps.PATCH("/departments/:id", handlers.UpdateDepartment)

		// Leave Approval
		hrOps.PATCH("/leave/approve/:id", handlers.ApproveLeave)

		// Attendance Reports (History)
		hrOps.GET("/attendance/reports", handlers.GetAttendanceReports)

		// Payroll Management
		hrOps.POST("/payroll/generate", handlers.GenerateMonthlyPayslips)
		hrOps.POST("/payroll/salary", handlers.ManageSalaries)
		hrOps.POST("/payroll/bonus-penalty", handlers.CreateBonusPenalty)
		hrOps.GET("/payroll/bonus-penalty", handlers.GetBonusPenalties)
		hrOps.DELETE("/payroll/bonus-penalty/:id", handlers.DeleteBonusPenalty)

		// Performance Management
		hrOps.GET("/performance/cycles", handlers.GetReviewCycles)
		hrOps.POST("/performance/cycles", handlers.CreateReviewCycle)
		hrOps.GET("/performance/reviews", handlers.GetPerformanceReviews)
		hrOps.POST("/performance/reviews", handlers.SubmitReview)

		// Announcements
		hrOps.POST("/announcements", handlers.CreateAnnouncement)
		hrOps.DELETE("/announcements/:id", handlers.DeleteAnnouncement)
	}

	// 4. Analytics & Director Group
	directorGroup := r.Group("/admin/v1/analytics")
	directorGroup.Use(middleware.AuthorizeRole("ADMIN", "DIRECTOR", "HR"))
	{
		directorGroup.GET("/headcount", handlers.GetHeadcountStats)
		directorGroup.GET("/turnover", handlers.GetTurnoverRate)
		directorGroup.GET("/attendance", handlers.GetAttendanceStats)
		directorGroup.GET("/expenses", handlers.GetPayrollExpenses)
	}
}
