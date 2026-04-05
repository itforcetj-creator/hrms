import axiosInstance from "@/lib/axios";
import { CreateDepartmentPayload, DepartmentSummary, UpdateDepartmentPayload } from "@/types/hr";

export const DepartmentService = {
  getAll: async () => {
    const response = await axiosInstance.get<DepartmentSummary[]>("/api/v1/departments");
    return response.data;
  },
  create: async (payload: CreateDepartmentPayload) => {
    const response = await axiosInstance.post<DepartmentSummary>("/admin/v1/departments", payload);
    return response.data;
  },
  update: async (id: number, payload: UpdateDepartmentPayload) => {
    const response = await axiosInstance.patch<DepartmentSummary>(`/admin/v1/departments/${id}`, payload);
    return response.data;
  },
};
