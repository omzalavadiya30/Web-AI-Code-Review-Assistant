"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/auth-api";
import { authStorage } from "@/lib/auth-storage";
import type {
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  User,
} from "@/types/auth";
import { ApiError } from "@/lib/api";
import { showApiSuccess } from "@/lib/toast";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<User>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const persistSession = useCallback((nextUser: User, token: string) => {
    authStorage.setToken(token);
    authStorage.setUser(nextUser);
    setUser(nextUser);
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = authStorage.getToken();
    if (!token) {
      setUser(null);
      return;
    }

    const response = await authApi.getProfile();
    if (response.data) {
      authStorage.setUser(response.data);
      setUser(response.data);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const storedUser = authStorage.getUser();
      const token = authStorage.getToken();

      if (storedUser && token) {
        setUser(storedUser);
        try {
          await refreshProfile();
        } catch {
          authStorage.clear();
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    init();
  }, [refreshProfile]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await authApi.login(payload);
      if (response.data) {
        persistSession(response.data.user, response.data.token);
        showApiSuccess(response.message);
        router.replace("/dashboard");
      }
    },
    [persistSession, router]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const response = await authApi.register(payload);
      authStorage.clear();
      setUser(null);
      showApiSuccess(response.message);
      router.replace("/login");
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      const response = await authApi.logout();
      showApiSuccess(response.message);
    } catch {
      // Token may already be invalid; still clear local session.
    } finally {
      authStorage.clear();
      setUser(null);
      router.replace("/login");
    }
  }, [router]);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const response = await authApi.updateProfile(payload);
    if (response.data) {
      authStorage.setUser(response.data);
      setUser(response.data);
      showApiSuccess(response.message);
      return response.data;
    }
    throw new ApiError("Failed to update profile", 400);
  }, []);

  const changePassword = useCallback(async (payload: ChangePasswordPayload) => {
    const response = await authApi.changePassword(payload);
    showApiSuccess(response.message);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      refreshProfile,
    }),
    [
      user,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
