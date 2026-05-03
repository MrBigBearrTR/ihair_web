import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Role } from "@/types/domain";

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  role: Role | null;
  expiresAt: string | null;
  username: string | null;
  setAuth: (payload: {
    accessToken: string;
    refreshToken: string;
    role: Role;
    expiresAt: string;
    username: string;
  }) => void;
  updateAccessToken: (accessToken: string, expiresAt: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      role: null,
      expiresAt: null,
      username: null,
      setAuth: (payload) =>
        set({
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          role: payload.role,
          expiresAt: payload.expiresAt,
          username: payload.username,
        }),
      updateAccessToken: (accessToken, expiresAt) =>
        set({ accessToken, expiresAt }),
      clearAuth: () =>
        set({
          accessToken: null,
          refreshToken: null,
          role: null,
          expiresAt: null,
          username: null,
        }),
    }),
    { name: "ihair-auth" },
  ),
);
