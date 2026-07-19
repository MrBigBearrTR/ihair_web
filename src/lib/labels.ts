import type {
  AppointmentStatus,
  DiscountType,
  Role,
  SettingType,
} from "@/types/domain";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Yönetici",
  SALON_OWNER: "Salon sahibi",
  EMPLOYEE: "Çalışan",
  CUSTOMER: "Müşteri",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: "Bekliyor",
  CONFIRMED: "Onaylandı",
  ARRIVED: "Geldi",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  PERCENTAGE: "Yüzde indirim",
  FIXED_AMOUNT: "Sabit tutar",
  FREE_SESSION: "Ücretsiz seans",
};

export const SETTING_TYPE_LABELS: Record<SettingType, string> = {
  TEXT: "Metin",
  IMAGE_BASE64: "Görsel",
  URL: "Bağlantı",
  JSON: "Yapılandırılmış veri",
};
