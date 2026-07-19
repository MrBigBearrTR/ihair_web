import type { AppointmentStatus, SaleStatus } from "@/types/domain";

export type SaleListFilters = {
  salonId?: number;
  status?: SaleStatus;
  from?: string;
  to?: string;
  employeeId?: number;
  page: number;
  size: number;
};

export type AppointmentListFilters = {
  salonId?: number;
  status?: AppointmentStatus;
  active?: boolean;
  from?: string;
  to?: string;
  page: number;
  size: number;
};

const salonScope = (salonId?: number) => salonId ?? "all";

export const queryKeys = {
  sales: {
    all: ["sales"] as const,
    lists: (salonId?: number) =>
      ["sales", "list", salonScope(salonId)] as const,
    list: (filters: SaleListFilters) =>
      [...queryKeys.sales.lists(filters.salonId), filters] as const,
    details: ["sales", "detail"] as const,
    detail: (saleId: number) => ["sales", "detail", saleId] as const,
    availableAppointments: (salonId: number) =>
      ["sales", "available-appointments", salonId] as const,
  },
  campaigns: {
    all: ["campaigns"] as const,
    list: (salonId?: number) =>
      ["campaigns", salonScope(salonId)] as const,
  },
  revenue: {
    all: ["revenue"] as const,
  },
  appointments: {
    all: ["appointments"] as const,
    lists: (salonId?: number) =>
      ["appointments", "list", salonScope(salonId)] as const,
    list: (filters: AppointmentListFilters) =>
      [...queryKeys.appointments.lists(filters.salonId), filters] as const,
    detail: (appointmentId: number) =>
      ["appointments", "detail", appointmentId] as const,
    weeks: ["appointments", "week"] as const,
    week: (salonId: number, weekStart: string) =>
      ["appointments", "week", salonId, weekStart] as const,
  },
  reference: {
    salons: ["reference", "salons"] as const,
    customers: (salonId?: number) =>
      ["reference", "customers", salonScope(salonId)] as const,
    employees: (salonId?: number) =>
      ["reference", "employees", salonScope(salonId)] as const,
    hairServices: (salonId?: number) =>
      ["reference", "hair-services", salonScope(salonId)] as const,
  },
  branding: {
    all: ["branding"] as const,
    globalLogo: ["branding", "global-logo"] as const,
    salonLogos: ["branding", "salon-logo"] as const,
    salonLogo: (salonId: number) =>
      ["branding", "salon-logo", salonId] as const,
  },
};

export const cacheTimes = {
  transactionList: 15_000,
  detail: 30_000,
  appointmentWeek: 45_000,
  reference: 10 * 60_000,
  branding: 10 * 60_000,
} as const;
