import axiosInstance from '@/lib/axios';
import { OnboardingTask } from '@/types/hr';

export interface CreateOnboardingTaskPayload {
  user_id: number;
  title: string;
  description?: string;
  due_date: string;
}

export interface UpdateOnboardingTaskPayload {
  title?: string;
  description?: string;
  due_date?: string;
  is_completed?: boolean;
}

export const OnboardingService = {
  // Get current user's onboarding tasks
  async getMyTasks(): Promise<OnboardingTask[]> {
    const response = await axiosInstance.get<OnboardingTask[]>('/api/v1/onboarding/tasks');
    return response.data;
  },

  // Create a new onboarding task
  async createTask(payload: CreateOnboardingTaskPayload): Promise<OnboardingTask> {
    const response = await axiosInstance.post<OnboardingTask>('/api/v1/onboarding/tasks', payload);
    return response.data;
  },

  // Update an onboarding task (e.g., toggle completion)
  async updateTask(taskId: number, payload: UpdateOnboardingTaskPayload): Promise<OnboardingTask> {
    const response = await axiosInstance.patch<OnboardingTask>(`/api/v1/onboarding/tasks/${taskId}`, payload);
    return response.data;
  },

  // Delete an onboarding task
  async deleteTask(taskId: number): Promise<void> {
    await axiosInstance.delete(`/api/v1/onboarding/tasks/${taskId}`);
  },

  // Get onboarding tasks for a specific user (HR/Admin)
  async getTasksForUser(userId: number): Promise<OnboardingTask[]> {
    const response = await axiosInstance.get<OnboardingTask[]>(`/admin/v1/users/${userId}/onboarding/tasks`);
    return response.data;
  },
};
