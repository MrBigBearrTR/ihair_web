import { api } from "@/api/client";
import type { Salon, SalonRequest } from "@/types/domain";

export async function listSalons() {
  const { data } = await api.get<Salon[]>("/api/salons");
  return data;
}

export async function getSalon(id: number) {
  const { data } = await api.get<Salon>(`/api/salons/${id}`);
  return data;
}

export async function createSalon(body: SalonRequest) {
  const { data } = await api.post<Salon>("/api/salons", body);
  return data;
}

export async function updateSalon(id: number, body: SalonRequest) {
  const { data } = await api.put<Salon>(`/api/salons/${id}`, body);
  return data;
}

export async function deleteSalon(id: number) {
  await api.delete(`/api/salons/${id}`);
}
