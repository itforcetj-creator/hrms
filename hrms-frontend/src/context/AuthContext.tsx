"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { UserProfile, LoginCredentials } from '@/types/auth';
import AuthService from '@/services/auth.service';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_USER_STORAGE_KEY = 'auth_user';
type ErrorResponse = {
  status?: number;
  data?: {
    message?: string;
    error?: string;
  };
};

const getErrorResponse = (error: unknown): ErrorResponse | undefined => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return undefined;
  }
  return (error as { response?: ErrorResponse }).response;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const saveUserToStorage = (userData: UserProfile) => {
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(userData));
  };

  const getUserFromStorage = (): UserProfile | null => {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      return null;
    }
  };

  const clearAuthState = () => {
    Cookies.remove('token');
    Cookies.remove('token', { path: '/' });
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    setUser(null);
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = Cookies.get('token');
      if (!token) {
        clearAuthState();
        setIsLoading(false);
        return;
      }

      // Hydrate from local storage first so refresh doesn't flash logged-out state.
      const cachedUser = getUserFromStorage();
      if (cachedUser) {
        setUser(cachedUser);
      }

      try {
        const userData = await AuthService.getCurrentUser();
        setUser(userData);
        saveUserToStorage(userData);
      } catch (error: unknown) {
        const status = getErrorResponse(error)?.status;
        if (status === 401) {
          clearAuthState();
        } else if (!cachedUser) {
          // No cached profile available and profile refresh failed.
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await AuthService.login(credentials);
      Cookies.set('token', response.token, { expires: 1, path: '/' }); // 1 day

      // Save CSRF token from login response for subsequent authenticated requests
      if (response.csrf_token) {
        Cookies.set('XSRF-TOKEN', response.csrf_token, { expires: 1, path: '/' });
      }

      // If the login response has the user, use it. Otherwise, fetch it.
      if (response.user) {
        setUser(response.user);
        saveUserToStorage(response.user);
      } else {
        const userData = await AuthService.getCurrentUser();
        setUser(userData);
        saveUserToStorage(userData);
      }
      
      router.push('/dashboard/profile');
    } catch (error: unknown) {
      throw (
        getErrorResponse(error)?.data?.message ||
        getErrorResponse(error)?.data?.error ||
        'Login failed'
      );
    }
  };

  const logout = () => {
    clearAuthState();
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
