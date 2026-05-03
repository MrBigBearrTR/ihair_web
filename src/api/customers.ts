import { api } from "@/api/client";
import type { Customer, CustomerRequest } from "@/types/domain";

export async function listCustomers() {
  const { data } = await api.get<Customer[]>("/api/customers");
  return data;
}

export async function getCustomer(id: number) {
  const { data } = await api.get<Customer>(`/api/customers/${id}`);
  return data;
}

export async function createCustomer(body: CustomerRequest) {
  const { data } = await api.post<Customer>("/api/customers", body);
  return data;
}

export async function updateCustomer(id: number, body: CustomerRequest) {
  const { data } = await api.put<Customer>(`/api/customers/${id}`, body);
  return data;
}

export async function deleteCustomer(id: number) {
  await api.delete(`/api/customers/${id}`);
}
