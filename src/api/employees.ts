import { api } from "@/api/client";
import type { Employee, EmployeeRequest } from "@/types/domain";

export async function listEmployees(salonId?: number) {
  const { data } = await api.get<Employee[]>("/api/employees", {
    params: salonId != null ? { salonId } : undefined,
  });
  return data;
}

export async function getEmployee(id: number) {
  const { data } = await api.get<Employee>(`/api/employees/${id}`);
  return data;
}

export async function createEmployee(body: EmployeeRequest) {
  const { data } = await api.post<Employee>("/api/employees", body);
  return data;
}

export async function updateEmployee(id: number, body: EmployeeRequest) {
  const { data } = await api.put<Employee>(`/api/employees/${id}`, body);
  return data;
}

export async function deleteEmployee(id: number) {
  await api.delete(`/api/employees/${id}`);
}
