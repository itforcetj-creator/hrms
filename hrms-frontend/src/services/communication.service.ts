import axiosInstance from '@/lib/axios';
import { Notification, Announcement } from '@/types/hr';

export type AnnouncementInput = {
  title: string;
  content: string;
  priority: string;
  target: string;
  department_id?: number;
};

export const NotificationService = {
  getAll: async () => {
    const response = await axiosInstance.get<Notification[]>('/api/v1/notifications');
    return response.data;
  },
  markRead: async (id: number) => {
    const response = await axiosInstance.patch<{ status: string }>(`/api/v1/notifications/${id}/read`);
    return response.data;
  },
  markAllRead: async () => {
    const response = await axiosInstance.patch<{ status: string }>('/api/v1/notifications/read-all');
    return response.data;
  },
};

export const AnnouncementService = {
  getAll: async () => {
    const response = await axiosInstance.get<Announcement[]>('/api/v1/announcements');
    return response.data;
  },
  create: async (data: AnnouncementInput) => {
    const response = await axiosInstance.post<Announcement>('/admin/v1/announcements', data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await axiosInstance.delete(`/admin/v1/announcements/${id}`);
    return response.data;
  },
};
