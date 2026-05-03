import { api } from "@/api/client";
import type { Campaign, CampaignRequest } from "@/types/domain";

export async function listCampaigns() {
  const { data } = await api.get<Campaign[]>("/api/campaigns");
  return data;
}

export async function getCampaign(id: number) {
  const { data } = await api.get<Campaign>(`/api/campaigns/${id}`);
  return data;
}

export async function validateCampaign(code: string) {
  const { data } = await api.get<Campaign>("/api/campaigns/validate", {
    params: { code },
  });
  return data;
}

export async function createCampaign(body: CampaignRequest) {
  const { data } = await api.post<Campaign>("/api/campaigns", body);
  return data;
}

export async function updateCampaign(id: number, body: CampaignRequest) {
  const { data } = await api.put<Campaign>(`/api/campaigns/${id}`, body);
  return data;
}

export async function deleteCampaign(id: number) {
  await api.delete(`/api/campaigns/${id}`);
}
