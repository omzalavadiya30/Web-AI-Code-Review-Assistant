import { api } from "./api";
import type {
  AuthResponse,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  UpdateProfilePayload,
  User,
} from "@/types/auth";

export const authApi = {
  register(payload: RegisterPayload) {
    return api.post<AuthResponse>("/auth/register", payload);
  },

  login(payload: LoginPayload) {
    return api.post<AuthResponse>("/auth/login", payload);
  },

  logout() {
    return api.post<null>("/auth/logout", {}, true);
  },

  getProfile() {
    return api.get<User>("/auth/profile", true);
  },

  updateProfile(payload: UpdateProfilePayload) {
    return api.put<User>("/auth/profile", payload, true);
  },

  changePassword(payload: ChangePasswordPayload) {
    return api.put<null>("/auth/change-password", payload, true);
  },

  forgotPassword(email: string) {
    return api.post<null>("/auth/forgot-password", { email });
  },

  resetPassword(payload: ResetPasswordPayload) {
    return api.post<null>("/auth/reset-password", payload);
  },
};
