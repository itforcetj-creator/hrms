package models

// Permission represents a specific action that can be performed in the system.
type Permission string

const (
	// User Permissions
	PermissionViewSelf     Permission = "view_self"
	PermissionEditSelf     Permission = "edit_self"
	PermissionViewDocuments Permission = "view_documents"

	// Manager/Dept Head Permissions
	PermissionViewTeam      Permission = "view_team"
	PermissionApproveLeave  Permission = "approve_leave"
	PermissionViewAttendance Permission = "view_attendance"

	// HR Permissions
	PermissionManagePayroll  Permission = "manage_payroll"
	PermissionManageContract Permission = "manage_contract"
	PermissionEditSalaries   Permission = "edit_salaries"

	// Admin Permissions
	PermissionManageUsers    Permission = "manage_users"
	PermissionSystemSettings Permission = "system_settings"
	PermissionDeleteData     Permission = "delete_data"
)

// RolePermissions maps each role to its direct permissions.
// This implements a clean separation between roles and their capabilities.
var RolePermissions = map[string][]Permission{
	RoleEmployee: {
		PermissionViewSelf,
		PermissionEditSelf,
		PermissionViewDocuments,
	},
	RoleManager: {
		PermissionViewTeam,
		PermissionApproveLeave,
		PermissionViewAttendance,
	},
	RoleHR: {
		PermissionManagePayroll,
		PermissionManageContract,
		PermissionEditSalaries,
	},
	RoleAdmin: {
		PermissionManageUsers,
		PermissionSystemSettings,
		PermissionDeleteData,
	},
}

// RoleInheritance defines which roles inherit permissions from others.
// Example: Admin inherits from HR, which inherits from Manager, etc.
var RoleInheritance = map[string][]string{
	RoleAdmin:    {RoleHR},
	RoleHR:       {RoleManager},
	RoleManager:  {RoleEmployee},
	RoleDirector: {RoleAdmin}, // Director has absolute power
}

// HasPermission checks if a role (including its inherited roles) has a specific permission.
func HasPermission(userRole string, targetPermission Permission) bool {
	// 1. Check direct permissions
	if permissions, ok := RolePermissions[userRole]; ok {
		for _, p := range permissions {
			if p == targetPermission {
				return true
			}
		}
	}

	// 2. Check inherited permissions (Recursive)
	if parents, ok := RoleInheritance[userRole]; ok {
		for _, parentRole := range parents {
			if HasPermission(parentRole, targetPermission) {
				return true
			}
		}
	}

	return false
}
