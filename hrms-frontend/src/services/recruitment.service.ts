import axiosInstance from "@/lib/axios";
import {
  CandidateStatus,
  CreateRecruitmentJobPayload,
  DepartmentSummary,
  InterviewNote,
  RecruitmentCandidate,
  RecruitmentJob,
  RecruitmentJobDetailsResponse,
} from "@/types/hr";

export const RecruitmentService = {
  getJobs: async (params?: { search?: string }) => {
    const response = await axiosInstance.get<RecruitmentJob[]>("/api/v1/recruitment/jobs", { params });
    return response.data;
  },
  getDepartments: async () => {
    const response = await axiosInstance.get<DepartmentSummary[]>("/api/v1/departments");
    return response.data;
  },
  createJob: async (payload: CreateRecruitmentJobPayload) => {
    const response = await axiosInstance.post<RecruitmentJob>("/admin/v1/recruitment/jobs", payload);
    return response.data;
  },
  getJobDetails: async (id: number) => {
    const response = await axiosInstance.get<RecruitmentJobDetailsResponse>(`/admin/v1/recruitment/jobs/${id}`);
    return response.data;
  },
  updateJob: async (id: number, payload: Partial<CreateRecruitmentJobPayload>) => {
    const response = await axiosInstance.patch<RecruitmentJob>(`/admin/v1/recruitment/jobs/${id}`, payload);
    return response.data;
  },
  deleteJob: async (id: number) => {
    const response = await axiosInstance.delete<{ message: string }>(`/admin/v1/recruitment/jobs/${id}`);
    return response.data;
  },
  getCandidatesByJob: async (jobId: number) => {
    const response = await axiosInstance.get<RecruitmentCandidate[]>(`/admin/v1/recruitment/jobs/${jobId}/candidates`);
    return response.data;
  },
  updateCandidateStatus: async (candidateId: number, status: CandidateStatus) => {
    const response = await axiosInstance.patch<{ message: string }>(`/admin/v1/recruitment/candidates/${candidateId}/status`, { status });
    return response.data;
  },
  getInterviewNotes: async (candidateId: number) => {
    const response = await axiosInstance.get<InterviewNote[]>(`/admin/v1/recruitment/candidates/${candidateId}/notes`);
    return response.data;
  },
  addInterviewNote: async (candidateId: number, payload: { score: number; comments: string }) => {
    const response = await axiosInstance.post<{ message: string; note: InterviewNote }>(
      `/admin/v1/recruitment/candidates/${candidateId}/notes`,
      payload
    );
    return response.data;
  },
  hireCandidate: async (candidateId: number) => {
    const response = await axiosInstance.post<{ message: string; employee_id: number }>(`/admin/v1/recruitment/hire/${candidateId}`);
    return response.data;
  },
};
