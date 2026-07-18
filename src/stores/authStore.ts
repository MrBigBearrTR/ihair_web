import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AuthorizedSalon, AuthResponse, Role } from "@/types/domain";

type AuthPayload = AuthResponse & { username: string };

function normalizeSalons(payload: Pick<AuthResponse, "salonId" | "salonIds" | "salons">) {
  const ids = payload.salonIds?.length
    ? payload.salonIds
    : payload.salons?.map((salon) => salon.id).length
      ? payload.salons.map((salon) => salon.id)
      : payload.salonId != null
        ? [payload.salonId]
        : [];
  const uniqueIds = [...new Set(ids)];
  const names = new Map((payload.salons ?? []).map((salon) => [salon.id, salon.name]));
  return uniqueIds.map((id) => ({ id, name: names.get(id) ?? `Salon #${id}` }));
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  role: Role | null;
  expiresAt: string | null;
  username: string | null;
  salonId: number | null;
  authorizedSalons: AuthorizedSalon[];
  activeSalonId: number | null;
  salonSelectionByUser: Record<string, number | null>;
  employeeId: number | null;
  setAuth: (payload: AuthPayload) => void;
  updateAuth: (payload: AuthResponse) => void;
  setAuthorizedSalons: (salons: AuthorizedSalon[]) => void;
  setActiveSalon: (salonId: number | null) => void;
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
      salonId: null,
      authorizedSalons: [],
      activeSalonId: null,
      salonSelectionByUser: {},
      employeeId: null,
      setAuth: (payload) =>
        set((state) => {
          const salons = normalizeSalons(payload);
          const remembered = state.salonSelectionByUser[payload.username];
          const preferred = remembered ?? payload.salonId;
          const activeSalonId =
            preferred != null && salons.some((salon) => salon.id === preferred)
              ? preferred
              : salons[0]?.id ?? null;
          return {
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            role: payload.role,
            expiresAt: payload.expiresAt,
            username: payload.username,
            salonId: payload.salonId ?? null,
            authorizedSalons: salons,
            activeSalonId,
            employeeId: payload.employeeId ?? null,
          };
        }),
      updateAuth: (payload) =>
        set((state) => {
          const salons = normalizeSalons(payload);
          const activeSalonId =
            state.activeSalonId != null &&
            salons.some((salon) => salon.id === state.activeSalonId)
              ? state.activeSalonId
              : payload.salonId != null &&
                  salons.some((salon) => salon.id === payload.salonId)
                ? payload.salonId
                : salons[0]?.id ?? null;
          return {
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            role: payload.role,
            expiresAt: payload.expiresAt,
            salonId: payload.salonId ?? null,
            authorizedSalons: salons,
            activeSalonId,
            employeeId: payload.employeeId ?? null,
          };
        }),
      setAuthorizedSalons: (salons) =>
        set((state) => {
          const unique = [...new Map(salons.map((salon) => [salon.id, salon])).values()];
          const activeSalonId =
            state.activeSalonId == null ||
            unique.some((salon) => salon.id === state.activeSalonId)
              ? state.activeSalonId
              : unique[0]?.id ?? null;
          return { authorizedSalons: unique, activeSalonId };
        }),
      setActiveSalon: (salonId) =>
        set((state) => {
          const valid =
            salonId == null
              ? state.role === "ADMIN"
              : state.authorizedSalons.some((salon) => salon.id === salonId);
          if (!valid) return state;
          return {
            activeSalonId: salonId,
            salonSelectionByUser: state.username
              ? { ...state.salonSelectionByUser, [state.username]: salonId }
              : state.salonSelectionByUser,
          };
        }),
      clearAuth: () =>
        set((state) => ({
          accessToken: null,
          refreshToken: null,
          role: null,
          expiresAt: null,
          username: null,
          salonId: null,
          authorizedSalons: [],
          activeSalonId: null,
          salonSelectionByUser: state.salonSelectionByUser,
          employeeId: null,
        })),
    }),
    { name: "ihair-auth" },
  ),
);
