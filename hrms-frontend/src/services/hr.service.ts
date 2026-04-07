import axiosInstance from '@/lib/axios';
import { UserProfile } from '@/types/auth';
import { Attendance, LeaveRequest, Payslip, LeaveStatus, HRDocument, BonusPenalty, BonusPenaltyType, PaginatedResponse, LeaveRequestPayload } from '@/types/hr';

export type { UserProfile } from '@/types/auth';
export type { LeaveRequestPayload };

export interface SalaryUpdatePayload {
  user_id: number;
  base_salary: number;
  currency?: string;
  bank_name?: string;
  account_number?: string;
  tax_id?: string;
  reason?: string;
}

export interface CreateBonusPenaltyPayload {
  user_id: number;
  type: BonusPenaltyType;
  amount: number;
  reason: string;
  date: string;
}

export const LeaveService = {
  // Get leave requests for the current user
  getRequests: async () => {
    const response = await axiosInstance.get<PaginatedResponse<LeaveRequest>>('/api/v1/leave/requests');
    return response.data.data;
  },
  // Get all leave requests (admin/HR view)
  getAll: async () => {
    const response = await axiosInstance.get<PaginatedResponse<LeaveRequest>>('/api/v1/leave/requests');
    return response.data.data;
  },
  // Submit a new leave request
  request: async (data: LeaveRequestPayload) => {
    const response = await axiosInstance.post<{ message: string; leave_request: LeaveRequest }>('/api/v1/leave/request', data);
    return response.data;
  },
  // Approve or reject a leave request
  approve: async (id: number, status: LeaveStatus) => {
    const response = await axiosInstance.patch<LeaveRequest>(`/api/v1/leave/approve/${id}`, { status });
    return response.data;
  },
  // Update status (alias for approve)
  updateStatus: async (id: number, status: LeaveStatus) => {
    const response = await axiosInstance.patch<LeaveRequest>(`/api/v1/leave/approve/${id}`, { status });
    return response.data;
  },
};

export const AttendanceService = {
  getReport: async (params?: { start_date?: string; end_date?: string; user_id?: number }) => {
    const response = await axiosInstance.get<PaginatedResponse<Attendance>>('/admin/v1/attendance/reports', { params });
    return response.data.data;
  },
  clockIn: async () => {
    const response = await axiosInstance.post<{ message: string; attendance: Attendance }>('/api/v1/attendance/clock-in');
    return response.data;
  },
  clockOut: async () => {
    const response = await axiosInstance.post<{ message: string; attendance: Attendance }>('/api/v1/attendance/clock-out');
    return response.data;
  }
};

export const DocumentService = {
  upload: async (formData: FormData) => {
    const response = await axiosInstance.post<{ message: string; document: HRDocument }>('/api/v1/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  uploadFile: async (file: File, type?: string) => {
    const formData = new FormData();
    formData.append('document', file);
    if (type) formData.append('type', type);
    const response = await axiosInstance.post<{ message: string; document: HRDocument }>('/api/v1/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  getAll: async (params?: { user_id?: number; type?: string }) => {
    const response = await axiosInstance.get<PaginatedResponse<HRDocument>>('/admin/v1/documents', { params });
    return response.data.data;
  },
  getAllByUsers: async (params: { user_id?: number }) => {
    const response = await axiosInstance.get<PaginatedResponse<HRDocument>>('/admin/v1/documents/users', { params });
    return response.data.data;
  },
  getMyDocuments: async () => {
    const response = await axiosInstance.get<HRDocument[]>('/api/v1/documents');
    return response.data;
  },
  download: async (id: number) => {
    const response = await axiosInstance.get(`/admin/v1/documents/${id}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },
  downloadManaged: async (id: number) => {
    const response = await axiosInstance.get(`/admin/v1/documents/${id}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },
  delete: async (id: number) => {
    const response = await axiosInstance.delete<{ message: string }>(`/admin/v1/documents/${id}`);
    return response.data;
  }
};

export const PayrollService = {
  getMyPayslips: async () => {
    const response = await axiosInstance.get<PaginatedResponse<Payslip>>('/api/v1/payroll/payslips');
    return response.data.data;
  },
  generateMonthly: async (month: number, year: number) => {
    const response = await axiosInstance.post<{ message: string }>('/admin/v1/payroll/generate', { month, year });
    return response.data;
  },
  updateSalary: async (data: SalaryUpdatePayload) => {
    const response = await axiosInstance.post<{ message: string }>('/admin/v1/payroll/salary', data);
    return response.data;
  },
  exportExcel: async (month: number, year: number) => {
    const response = await axiosInstance.get('/admin/v1/payroll/export', {
      params: { month, year },
      responseType: 'blob'
    });
    return response.data;
  },
};

export const BonusPenaltyService = {
  create: async (data: CreateBonusPenaltyPayload) => {
    const response = await axiosInstance.post<BonusPenalty>('/admin/v1/payroll/bonus-penalty', data);
    return response.data;
  },
  getAll: async (params?: { user_id?: number; month?: number; year?: number }) => {
    const response = await axiosInstance.get<BonusPenalty[]>('/admin/v1/payroll/bonus-penalty', { params });
    return response.data;
  },
  delete: async (id: number) => {
    const response = await axiosInstance.delete<{ message: string }>(`/admin/v1/payroll/bonus-penalty/${id}`);
    return response.data;
  },
};

export const UserService = {
  getAll: async (params?: { search?: string }) => {
    const response = await axiosInstance.get<PaginatedResponse<UserProfile>>('/admin/v1/users', { params });
    return response.data.data;
  },
  getProfile: async (id: number) => {
    const response = await axiosInstance.get<UserProfile>(`/admin/v1/users/${id}`);
    return response.data;
  },
  downloadContract: async (id: number) => {
    const response = await axiosInstance.get(`/admin/v1/users/${id}/contract`, {
      responseType: 'blob'
    });
    return response.data;
  }
};
