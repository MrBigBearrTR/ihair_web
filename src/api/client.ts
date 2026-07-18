import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import { useAuthStore } from "@/stores/authStore";
import type { ApiErrorBody, AuthResponse, RefreshRequest } from "@/types/domain";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "";

export const publicApi = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const { data } = await publicApi.post<AuthResponse>(
          "/api/auth/refresh",
          { refreshToken } satisfies RefreshRequest,
        );
        useAuthStore.getState().updateAuth(data);
        return data.accessToken;
      } catch {
        useAuthStore.getState().clearAuth();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.assign("/login");
        }
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const status = error.response?.status;
    const url = original?.url ?? "";

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !url.includes("/api/auth/login") &&
      !url.includes("/api/auth/refresh")
    ) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }

    return Promise.reject(error);
  },
);

const DEFAULT_ERROR_MESSAGE = "Bir hata oluştu";

function isTurkishMessage(message: string) {
  return /[çğıöşüÇĞİÖŞÜ]|\b(bir|bu|için|geçersiz|bulunamadı|hata|zaten|gerekli|yetkiniz)\b/i.test(
    message,
  );
}

export function getApiErrorMessage(err: unknown, fallback = DEFAULT_ERROR_MESSAGE) {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    const message = err.response?.data?.message;
    if (message && isTurkishMessage(message)) return message;
    if (!err.response) return "Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.";
    if (fallback !== DEFAULT_ERROR_MESSAGE) return fallback;
    const statusMessages: Record<number, string> = {
      400: "Gönderilen bilgiler geçersiz.",
      401: "Oturumunuz geçersiz veya süresi dolmuş.",
      403: "Bu işlem için yetkiniz yok.",
      404: "İstenen kayıt bulunamadı.",
      409: "Bu işlem mevcut bir kayıtla çakışıyor.",
      500: "Sunucuda beklenmeyen bir hata oluştu.",
    };
    return statusMessages[err.response.status] ?? fallback;
  }
  if (err instanceof Error && err.message && isTurkishMessage(err.message)) {
    return err.message;
  }
  return fallback;
}
