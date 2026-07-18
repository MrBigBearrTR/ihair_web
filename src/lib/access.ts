import type { Role } from "@/types/domain";

export const PAGE_ROLES = {
  dashboard: ["ADMIN", "SALON_OWNER", "EMPLOYEE"],
  salons: ["ADMIN"],
  employees: ["ADMIN", "SALON_OWNER"],
  hairServices: ["ADMIN", "SALON_OWNER"],
  customers: ["ADMIN", "SALON_OWNER", "EMPLOYEE"],
  appointments: ["ADMIN", "SALON_OWNER", "EMPLOYEE"],
  sales: ["ADMIN", "SALON_OWNER", "EMPLOYEE"],
  revenue: ["ADMIN", "SALON_OWNER"],
  campaigns: ["ADMIN", "SALON_OWNER"],
  campaignValidate: ["ADMIN", "SALON_OWNER", "EMPLOYEE"],
  users: ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type PageKey = keyof typeof PAGE_ROLES;

export function canAccess(role: Role | null, page: PageKey) {
  return Boolean(role && (PAGE_ROLES[page] as readonly Role[]).includes(role));
}
