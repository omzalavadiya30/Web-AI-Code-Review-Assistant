import type { ApiResponse } from "@/types/auth";
import { authStorage } from "./auth-storage";
import { showApiError } from "./toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type ApiValidationError = { msg: string; path: string };

export class ApiError extends Error {
  status: number;
  errors?: ApiValidationError[];

  constructor(message: string, status: number, errors?: ApiValidationError[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

const isValidationError = (value: unknown): value is ApiValidationError =>
  typeof value === "object" &&
  value !== null &&
  "msg" in value &&
  typeof (value as ApiValidationError).msg === "string";

const normalizeErrors = (errors: unknown): ApiValidationError[] | undefined => {
  if (!Array.isArray(errors)) return undefined;

  const normalized = errors.filter(isValidationError).map((error) => ({
    msg: error.msg,
    path: typeof error.path === "string" ? error.path : "body",
  }));

  return normalized.length > 0 ? normalized : undefined;
};

const parseApiResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  const text = await response.text();

  if (!text) {
    return {
      success: response.ok,
      message: response.statusText || (response.ok ? "Request successful" : "Request failed"),
    };
  }

  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    return {
      success: false,
      message: response.ok
        ? "Server returned an invalid response"
        : response.statusText || "Request failed",
    };
  }
};

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

    const data = await parseApiResponse<T>(response);

    if (!response.ok || !data.success) {
      const apiError = new ApiError(
        data.message || `Request failed with status ${response.status}`,
        response.status,
        normalizeErrors(data.errors)
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
