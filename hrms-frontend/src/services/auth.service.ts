import axiosInstance from '@/lib/axios';
import { LoginCredentials, AuthResponse, UserProfile } from '@/types/auth';

const AuthService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/login', credentials);
    return response.data;
  },

  getCurrentUser: async (): Promise<UserProfile> => {
    const response = await axiosInstance.get<UserProfile>('/api/v1/me'); 
    return response.data;
  },
};

export default AuthService;
