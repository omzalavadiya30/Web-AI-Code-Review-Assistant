import type { ApiResponse } from "@/types/auth";
import { authStorage } from "./auth-storage";
import { showApiError } from "./toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export class ApiError extends Error {
  status: number;
  errors?: { msg: string; path: string }[];

  constructor(message: string, status: number, errors?: { msg: string; path: string }[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  auth = false
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (auth) {
    const token = authStorage.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok || !data.success) {
      const apiError = new ApiError(
        data.message || "Something went wrong",
        response.status,
        data.errors
      );
      showApiError(apiError);
      throw apiError;
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    const networkError = new ApiError("Network error. Please try again.", 0);
    showApiError(networkError);
    throw networkError;
  }
}

export const api = {
  get: <T>(endpoint: string, auth = false) =>
    request<T>(endpoint, { method: "GET" }, auth),

  post: <T>(endpoint: string, body: unknown, auth = false) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }, auth),

  put: <T>(endpoint: string, body: unknown, auth = false) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }, auth),
};
