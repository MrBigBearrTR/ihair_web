export type Role = "ADMIN" | "SALON_OWNER" | "EMPLOYEE" | "CUSTOMER";

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SESSION";

export type SettingType = "TEXT" | "IMAGE_BASE64" | "URL" | "JSON";

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  role: Role;
  expiresAt: string;
  salonId: number | null;
  salonIds: number[];
  salons: AuthorizedSalon[];
  employeeId: number | null;
}

export interface AuthorizedSalon {
  id: number;
  name: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RegisterRequest {
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  role: Role;
  salonId?: number | null;
  salonIds?: number[];
  defaultSalonId?: number | null;
  employeeId?: number | null;
}

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: Role;
  salonId?: number | null;
  salonIds?: number[];
  salons?: AuthorizedSalon[];
  employeeId?: number | null;
  active: boolean;
  createdAt: string;
}

export interface UserSalonAssignmentRequest {
  salonIds: number[];
  defaultSalonId: number | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ApiErrorBody {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  code?: string;
  details?: unknown;
  data?: unknown;
  path?: string;
}

export interface Salon {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  active: boolean;
}

export interface SalonRequest {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface SalonSetting {
  id: number;
  salonId: number;
  settingKey: string;
  settingType: SettingType;
  settingValue: string;
}

export interface SalonSettingRequest {
  settingType: SettingType;
  settingValue: string;
}

export interface Employee {
  id: number;
  salonId: number;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  active: boolean;
}

export interface EmployeeRequest {
  salonId?: number | null;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
}

export interface Customer {
  id: number;
  salonId: number;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  active: boolean;
}

export interface CustomerRequest {
  salonId?: number | null;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface HairService {
  id: number;
  salonId: number;
  name: string;
  description?: string | null;
  price: number | string;
  durationMinutes?: number | null;
  active: boolean;
}

export interface HairServiceRequest {
  salonId?: number | null;
  name: string;
  description?: string | null;
  price: number;
  durationMinutes?: number | null;
}

export interface Appointment {
  id: number;
  customerId: number;
  customerName: string;
  employeeId: number;
  employeeName: string;
  hairServiceId: number;
  hairServiceName: string;
  salonId: number;
  campaignCode?: string | null;
  appointmentDateTime: string;
  status: AppointmentStatus;
  hairServicePrice: number | string;
  notes?: string | null;
  finalPrice: number | string;
  createdAt: string;
  durationMinutes?: number | null;
  endDateTime?: string | null;
  endsAt?: string | null;
  scheduleOverridden?: boolean;
  version?: number | null;
}

export interface AppointmentRequest {
  customerId: number;
  employeeId: number;
  hairServiceId: number;
  appointmentDateTime: string;
  campaignCode?: string | null;
  status?: AppointmentStatus | null;
  notes?: string | null;
  overrideOutsideWorkingHours?: boolean;
  overrideReason?: string | null;
  version?: number | null;
}

export interface AppointmentStatusRequest {
  status: AppointmentStatus;
}

export type WeekDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface SalonScheduleDay {
  dayOfWeek: WeekDay;
  open: boolean;
  opensAt: string;
  closesAt: string;
}

export interface SalonHoliday {
  id: number;
  salonId?: number;
  startDate: string;
  endDate: string;
  description?: string | null;
}

export interface SalonHolidayRequest {
  startDate: string;
  endDate: string;
  description?: string | null;
}

export interface SalonSchedule {
  timeZone: string;
  days: SalonScheduleDay[];
  holidays: SalonHoliday[];
}

export interface AppointmentWeek {
  appointments: Appointment[];
  schedule: SalonSchedule;
}

export interface Campaign {
  id: number;
  salonId: number;
  name: string;
  code: string;
  discountType: DiscountType;
  discountValue: number | string;
  maxUsageCount?: number | null;
  usedCount?: number | null;
  isCustomerSpecific?: boolean;
  customerId?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  active: boolean;
}

export interface CampaignRequest {
  salonId?: number | null;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  code?: string | null;
  maxUsageCount?: number | null;
  isCustomerSpecific?: boolean;
  customerId?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
}

export type SaleStatus = "OPEN" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER";

export interface SaleItem {
  id?: number;
  hairServiceId: number;
  hairServiceName: string;
  employeeId: number;
  employeeName: string;
  quantity: number;
  unitPrice: number | string;
  finalPrice?: number | string;
}

export interface Sale {
  id: number;
  salonId: number;
  customerId: number;
  customerName: string;
  sourceAppointmentId?: number | null;
  status: SaleStatus;
  items: SaleItem[];
  totalAmount: number | string;
  payments?: SalePayment[];
  createdAt: string;
  completedAt?: string | null;
}

export interface SaleItemRequest {
  serviceId: number;
  employeeId: number;
  quantity: number;
  position?: number;
}

export interface SaleRequest {
  salonId: number;
  customerId: number;
  sourceAppointmentId?: number | null;
  items: SaleItemRequest[];
}

export interface SalePayment {
  method: PaymentMethod;
  amount: number;
}

export interface CompleteSaleRequest {
  payments: SalePayment[];
}

export interface AvailableSaleAppointment {
  id: number;
  salonId: number;
  customerId: number;
  customerName: string;
  hairServiceId: number;
  hairServiceName: string;
  employeeId: number;
  employeeName: string;
  finalPrice: number | string;
  appointmentDateTime: string;
}

export type RevenueGrouping = "daily" | "monthly" | "employee";

export interface RevenueSummary {
  totalRevenue: number;
  saleCount: number;
  averageSale: number;
  serviceCount: number;
}

export interface RevenueGroup {
  key: string;
  label: string;
  revenue: number;
  saleCount: number;
}

export interface RevenuePaymentBreakdown {
  method: PaymentMethod;
  amount: number;
  count: number;
}

export interface RevenueReport {
  summary: RevenueSummary;
  groups: RevenueGroup[];
  payments: RevenuePaymentBreakdown[];
}
