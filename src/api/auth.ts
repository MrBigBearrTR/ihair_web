import { api, publicApi } from "@/api/client";
import type {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
} from "@/types/domain";

export async function login(body: LoginRequest) {
  const { data } = await publicApi.post<AuthResponse>("/api/auth/login", body);
  return data;
}

export async function refresh(refreshToken: string) {
  const { data } = await publicApi.post<AuthResponse>("/api/auth/refresh", {
    refreshToken,
  } satisfies RefreshRequest);
  return data;
}

export async function logout() {
  await api.post("/api/auth/logout");
}

export async function register(body: RegisterRequest) {
  await api.post("/api/auth/register", body);
}

export async function changePassword(body: ChangePasswordRequest) {
  await api.put("/api/auth/change-password", body);
}
