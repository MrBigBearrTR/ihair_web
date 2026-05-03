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
  password: string;
  role: Role;
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
  salonId: number;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
}

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  active: boolean;
}

export interface CustomerRequest {
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
  salonId: number;
  name: string;
  description?: string | null;
  price: number;
  durationMinutes?: number | null;
}

export interface Appointment {
  id: number;
  customerId: number;
  employeeId: number;
  hairServiceId: number;
  campaignId?: number | null;
  appointmentDateTime: string;
  status: AppointmentStatus;
  finalPrice?: number | string | null;
  customer?: Customer | null;
  employee?: Employee | null;
  hairService?: HairService | null;
  campaign?: Campaign | null;
}

export interface AppointmentRequest {
  customerId: number;
  employeeId: number;
  hairServiceId: number;
  appointmentDateTime: string;
  campaignCode?: string | null;
  status?: AppointmentStatus | null;
}

export interface Campaign {
  id: number;
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
