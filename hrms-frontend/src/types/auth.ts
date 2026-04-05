export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: string;
  department?: { id: number; name: string };
  department_id?: number;
  position?: { id: number; title: string };
  position_id?: number;
  is_active: boolean;
  leave_balance?: number;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
