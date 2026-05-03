import { api } from "@/api/client";
import type { SalonSetting, SalonSettingRequest } from "@/types/domain";

export async function listSettings(salonId: number) {
  const { data } = await api.get<SalonSetting[]>(
    `/api/salons/${salonId}/settings`,
  );
  return data;
}

export async function getSetting(salonId: number, key: string) {
  const { data } = await api.get<SalonSetting>(
    `/api/salons/${salonId}/settings/${encodeURIComponent(key)}`,
  );
  return data;
}

export async function upsertSetting(
  salonId: number,
  key: string,
  body: SalonSettingRequest,
) {
  const { data } = await api.put<SalonSetting>(
    `/api/salons/${salonId}/settings/${encodeURIComponent(key)}`,
    body,
  );
  return data;
}

export async function deleteSetting(salonId: number, key: string) {
  await api.delete(
    `/api/salons/${salonId}/settings/${encodeURIComponent(key)}`,
  );
}
