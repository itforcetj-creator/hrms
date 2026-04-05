import axiosInstance from '@/lib/axios';
import { Asset } from '@/types/hr';

export interface CreateAssetPayload {
  name: string;
  serial_number: string;
  category: string;
  status?: string;
}

export interface UpdateAssetPayload {
  name?: string;
  serial_number?: string;
  category?: string;
  status?: string;
}

export const AssetService = {
  getAll: async (params?: { category?: string; status?: string }): Promise<Asset[]> => {
    const response = await axiosInstance.get<Asset[]>('/admin/v1/assets', { params });
    return response.data;
  },

  getMyAssets: async (): Promise<Asset[]> => {
    const response = await axiosInstance.get<Asset[]>('/api/v1/assets/my');
    return response.data;
  },

  create: async (payload: CreateAssetPayload): Promise<Asset> => {
    const response = await axiosInstance.post<Asset>('/admin/v1/assets', payload);
    return response.data;
  },

  update: async (id: number, payload: UpdateAssetPayload): Promise<Asset> => {
    const response = await axiosInstance.patch<Asset>(`/admin/v1/assets/${id}`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/admin/v1/assets/${id}`);
  },

  assign: async (assetId: number, userId: number): Promise<Asset> => {
    const response = await axiosInstance.post<{ asset: Asset }>('/admin/v1/assets/assign', {
      asset_id: assetId,
      user_id: userId,
    });
    return response.data.asset;
  },

  unassign: async (assetId: number): Promise<Asset> => {
    const response = await axiosInstance.post<{ asset: Asset }>(`/admin/v1/assets/${assetId}/unassign`);
    return response.data.asset;
  },
};
