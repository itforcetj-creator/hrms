import axiosInstance from '@/lib/axios';
import { Goal, PerformanceReview, ReviewCycle } from '@/types/hr';

export const PerformanceService = {
  // Goal Tracking
  getMyGoals: async () => {
    const response = await axiosInstance.get<Goal[]>('/api/v1/performance/goals');
    return response.data;
  },
  createGoal: async (data: Partial<Goal>) => {
    const response = await axiosInstance.post<Goal>('/api/v1/performance/goals', data);
    return response.data;
  },

  // Review Cycles (Admin)
  getReviewCycles: async () => {
    const response = await axiosInstance.get<ReviewCycle[]>('/admin/v1/performance/cycles');
    return response.data;
  },
  createReviewCycle: async (data: Partial<ReviewCycle>) => {
    const response = await axiosInstance.post<ReviewCycle>('/admin/v1/performance/cycles', data);
    return response.data;
  },

  // Submitting Reviews
  submitReview: async (review: Partial<PerformanceReview>) => {
    const response = await axiosInstance.post<PerformanceReview>('/admin/v1/performance/reviews', review);
    return response.data;
  }
};
