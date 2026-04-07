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
  passport_series?: string;
  passport_number?: string;
  passport_issued_by?: string;
  passport_issued_date?: string | null;
  birth_date?: string | null;
  birth_place?: string;
  inn?: string;
  snils?: string;
  address?: string;
  phone?: string;
}

export interface AuthResponse {
  token: string;
  csrf_token?: string;
  // Full user profile should be fetched via GET /me after login
}

export interface LoginCredentials {
  email: string;
  password: string;
}
