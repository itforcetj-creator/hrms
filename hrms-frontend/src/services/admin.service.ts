import axiosInstance from '@/lib/axios';
import { UserProfile } from '@/types/auth';
import { AuditLog, HeadcountStat, TurnoverStat } from '@/types/hr';

export const AdminService = {
  // User Management
  getUsers: async (params?: { department?: string; search?: string; role?: string }) => {
    const response = await axiosInstance.get<UserProfile[]>('/admin/v1/users', { params });
    return response.data;
  },
  createUser: async (data: Partial<UserProfile> & { password?: string }) => {
    const response = await axiosInstance.post<UserProfile>('/admin/v1/users', data);
    return response.data;
  },
  updateUser: async (id: number, data: Partial<UserProfile> & { password?: string }) => {
    const response = await axiosInstance.patch<UserProfile>(`/admin/v1/users/${id}`, data);
    return response.data;
  },
  deleteUser: async (id: number) => {
    const response = await axiosInstance.delete(`/admin/v1/users/${id}`);
    return response.data;
  },

  // Company Management (for Forms)
  getDepartments: async () => {
    const response = await axiosInstance.get('/api/v1/departments');
    return response.data;
  },
  getPositions: async (departmentId?: number) => {
    const response = await axiosInstance.get('/api/v1/positions', {
      params: { department_id: departmentId }
    });
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async () => {
    const response = await axiosInstance.get<AuditLog[]>('/admin/v1/audit/logs');
    return response.data;
  },

  // Analytics
  getHeadcountStats: async () => {
    const response = await axiosInstance.get<HeadcountStat[]>('/admin/v1/analytics/headcount');
    return response.data;
  },
  getTurnoverStats: async () => {
    const response = await axiosInstance.get<TurnoverStat>('/admin/v1/analytics/turnover');
    return response.data;
  }
};
