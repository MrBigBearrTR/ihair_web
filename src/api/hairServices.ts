import { api } from "@/api/client";
import type { HairService, HairServiceRequest } from "@/types/domain";

export async function listHairServices(salonId?: number) {
  const { data } = await api.get<HairService[]>("/api/hair-services", {
    params: salonId != null ? { salonId } : undefined,
  });
  return data;
}

export async function getHairService(id: number) {
  const { data } = await api.get<HairService>(`/api/hair-services/${id}`);
  return data;
}

export async function createHairService(body: HairServiceRequest) {
  const { data } = await api.post<HairService>("/api/hair-services", body);
  return data;
}

export async function updateHairService(id: number, body: HairServiceRequest) {
  const { data } = await api.put<HairService>(`/api/hair-services/${id}`, body);
  return data;
}

export async function deleteHairService(id: number) {
  await api.delete(`/api/hair-services/${id}`);
}
