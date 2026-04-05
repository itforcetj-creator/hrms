"use client";

import React, { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { hasPermission, isAuthorized, Permission } from "@/utils/permission";

interface PermissionGateProps {
  permission?: Permission;
  role?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  role,
  fallback = null,
  children,
}) => {
  const { user } = useAuth();

  if (!user) return <>{fallback}</>;

  if (permission && !hasPermission(user.role, permission)) {
    return <>{fallback}</>;
  }

  if (role && !isAuthorized(user.role, role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
