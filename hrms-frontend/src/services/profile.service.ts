import axiosInstance from '@/lib/axios';
import { Attendance, LeaveRequest, Payslip, HRDocument, PaginatedResponse } from '@/types/hr';

// Profile Service acts as an aggregate for current user's profile operations
export const ProfileService = {
  getAttendance: async () => {
    try {
      const response = await axiosInstance.get<PaginatedResponse<Attendance>>('/admin/v1/attendance/reports');
      return response.data.data;
    } catch {
      return [];
    }
  },
  getLeaves: async () => {
    const response = await axiosInstance.get<PaginatedResponse<LeaveRequest>>('/api/v1/leave/requests');
    return response.data.data;
  },
  getPayslips: async () => {
    const response = await axiosInstance.get<PaginatedResponse<Payslip>>('/api/v1/payroll/payslips');
    return response.data.data;
  },
  getDocuments: async () => {
    const response = await axiosInstance.get<HRDocument[]>('/api/v1/documents');
    return response.data;
  },
  uploadDocument: async (file: File, fileType: string, isContract: boolean = false) => {
    const formData = new FormData();
    formData.append('document', file);
    if (fileType.trim()) {
      formData.append('type', fileType.trim());
    }
    if (isContract) {
      formData.append('is_contract', 'true');
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
  deleteDocument: async (id: number) => {
    const response = await axiosInstance.delete<{ message: string }>(`/api/v1/documents/${id}`);
    return response.data;
  },
  updateMe: async (data: { phone?: string; address?: string; birth_place?: string }) => {
    const response = await axiosInstance.patch<{ message: string }>('/api/v1/me', data);
    return response.data;
  }
};
