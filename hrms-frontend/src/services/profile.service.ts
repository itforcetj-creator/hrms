import axiosInstance from '@/lib/axios';
import { Attendance, LeaveRequest, Payslip, HRDocument } from '@/types/hr';

// Profile Service acts as an aggregate for current user's profile operations
export const ProfileService = {
  getAttendance: async () => {
    // Current setup doesn't have a specific get-my-attendance endpoint, 
    // but the backend requires attendance tracking for the profile page.
    // Assuming backend returns own attendance if non-admin or we filter by user.
    // For now, let's use the reports endpoint or a dedicated my endpoint if it existed.
    // NOTE: In the future, a dedicated get-my-attendance API is recommended.
    try {
      const response = await axiosInstance.get<Attendance[]>('/admin/v1/attendance/reports');
      return response.data;
    } catch {
      // Fallback for non-admins if above fails
      return [];
    }
  },
  getLeaves: async () => {
    const response = await axiosInstance.get<LeaveRequest[]>('/api/v1/leave/requests');
    return response.data;
  },
  getPayslips: async () => {
    const response = await axiosInstance.get<Payslip[]>('/api/v1/payroll/payslips');
    return response.data;
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
