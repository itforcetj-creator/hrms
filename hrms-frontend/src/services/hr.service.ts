import axiosInstance from '@/lib/axios';
import { Attendance, LeaveRequest, Payslip, LeaveStatus, HRDocument } from '@/types/hr';
import { UserProfile } from '@/types/auth';

export interface LeaveRequestPayload {
  type: "VACATION" | "SICK" | "UNPAID" | "MATERNITY";
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface SalaryUpdatePayload {
  user_id: number;
  base_salary: number;
  currency?: string;
  bank_name?: string;
  account_number?: string;
  tax_id?: string;
  reason?: string;
}

export const AttendanceService = {
  clockIn: async () => {
    const response = await axiosInstance.post<{ message: string; time: string }>('/api/v1/attendance/clock-in');
    return response.data;
  },
  clockOut: async () => {
    const response = await axiosInstance.post<{ message: string; total_hours: number }>('/api/v1/attendance/clock-out');
    return response.data;
  },
  getReports: async () => {
    const response = await axiosInstance.get<Attendance[]>('/admin/v1/attendance/reports');
    return response.data;
  }
};

export const LeaveService = {
  request: async (data: LeaveRequestPayload) => {
    const response = await axiosInstance.post<LeaveRequest>('/api/v1/leave/request', data);
    return response.data;
  },
  getRequests: async () => {
    const response = await axiosInstance.get<LeaveRequest[]>('/api/v1/leave/requests');
    return response.data;
  },
  approve: async (id: number, status: LeaveStatus) => {
    const response = await axiosInstance.patch<LeaveRequest>(`/api/v1/leave/approve/${id}`, { status });
    return response.data;
  }
};

export const PayrollService = {
  getMyPayslips: async () => {
    const response = await axiosInstance.get<Payslip[]>('/api/v1/payroll/payslips');
    return response.data;
  },
  generateMonthly: async (month: number, year: number) => {
    const response = await axiosInstance.post<{ message: string }>('/admin/v1/payroll/generate', { month, year });
    return response.data;
  },
  updateSalary: async (data: SalaryUpdatePayload) => {
    const response = await axiosInstance.post<{ message: string }>('/admin/v1/payroll/salary', data);
    return response.data;
  },
};

export const UserService = {
  getAll: async () => {
    const response = await axiosInstance.get<UserProfile[]>('/admin/v1/users');
    return response.data;
  }
};

export const DocumentService = {
  getMyDocuments: async () => {
    const response = await axiosInstance.get<HRDocument[]>('/api/v1/documents');
    return response.data;
  },
  getAllByUsers: async (params?: { user_id?: number; search?: string }) => {
    const response = await axiosInstance.get<HRDocument[]>('/admin/v1/documents', { params });
    return response.data;
  },
  upload: async (file: File, fileType: string) => {
    const formData = new FormData();
    formData.append('document', file);
    if (fileType.trim()) {
      formData.append('type', fileType.trim());
    }

    const response = await axiosInstance.post<{ message: string; document: HRDocument }>(
      '/api/v1/documents/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
  download: async (id: number) => {
    const response = await axiosInstance.get<Blob>(`/api/v1/documents/${id}`, {
      responseType: 'blob',
    });
    return response.data;
  },
  downloadManaged: async (id: number) => {
    const response = await axiosInstance.get<Blob>(`/admin/v1/documents/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
