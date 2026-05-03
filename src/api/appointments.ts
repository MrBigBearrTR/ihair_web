import { api } from "@/api/client";
import type { Appointment, AppointmentRequest } from "@/types/domain";

export async function listAppointments() {
  const { data } = await api.get<Appointment[]>("/api/appointments");
  return data;
}

export async function getAppointment(id: number) {
  const { data } = await api.get<Appointment>(`/api/appointments/${id}`);
  return data;
}

export async function createAppointment(body: AppointmentRequest) {
  const { data } = await api.post<Appointment>("/api/appointments", body);
  return data;
}

export async function updateAppointment(
  id: number,
  body: Partial<AppointmentRequest>,
) {
  const { data } = await api.put<Appointment>(
    `/api/appointments/${id}`,
    body,
  );
  return data;
}

export async function deleteAppointment(id: number) {
  await api.delete(`/api/appointments/${id}`);
}
