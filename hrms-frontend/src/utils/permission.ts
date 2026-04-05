export type Permission = 
  | "view_self"
  | "edit_self"
  | "view_documents"
  | "view_team"
  | "approve_leave"
  | "view_attendance"
  | "manage_payroll"
  | "manage_contract"
  | "edit_salaries"
  | "manage_users"
  | "system_settings"
  | "delete_data";

export const RoleEmployee = "USER";
export const RoleManager = "DEPARTMENT_HEAD";
export const RoleHR = "HR";
export const RoleAdmin = "ADMIN";
export const RoleDirector = "DIRECTOR";

export const RolePermissions: Record<string, Permission[]> = {
  [RoleEmployee]: ["view_self", "edit_self", "view_documents"],
  [RoleManager]: ["view_team", "approve_leave", "view_attendance"],
  [RoleHR]: ["manage_payroll", "manage_contract", "edit_salaries"],
  [RoleAdmin]: ["manage_users", "system_settings", "delete_data"],
};

export const RoleInheritance: Record<string, string[]> = {
  [RoleAdmin]: [RoleHR],
  [RoleHR]: [RoleManager],
  [RoleManager]: [RoleEmployee],
  [RoleDirector]: [RoleAdmin],
};

export const hasPermission = (userRole: string, targetPermission: Permission): boolean => {
  // 1. Check direct permissions
  const direct = RolePermissions[userRole] || [];
  if (direct.includes(targetPermission)) return true;

  // 2. Check inherited permissions
  const parents = RoleInheritance[userRole] || [];
  for (const parentRole of parents) {
    if (hasPermission(parentRole, targetPermission)) return true;
  }

  return false;
};

export const isAuthorized = (userRole: string, requiredRole: string): boolean => {
  if (userRole === requiredRole) return true;
  const parents = RoleInheritance[userRole] || [];
  for (const parentRole of parents) {
    if (isAuthorized(parentRole, requiredRole)) return true;
  }
  return false;
};
