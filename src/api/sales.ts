import { api } from "@/api/client";
import type {
  Appointment,
  AvailableSaleAppointment,
  CompleteSaleRequest,
  Sale,
  SaleItem,
  SaleRequest,
  SaleStatus,
  PaymentMethod,
} from "@/types/domain";

function unwrapList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["content", "items", "data", "results", "sales"]) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return [];
}

function normalizeItem(value: Record<string, unknown>): SaleItem {
  const service = (value.hairService ?? value.service ?? {}) as Record<string, unknown>;
  const employee = (value.employee ?? {}) as Record<string, unknown>;
  return {
    id: Number(value.id) || undefined,
    hairServiceId: Number(value.hairServiceId ?? value.serviceId ?? service.id),
    hairServiceName: String(
      value.hairServiceName ?? value.serviceName ?? service.name ?? "Hizmet",
    ),
    employeeId: Number(value.employeeId ?? employee.id),
    employeeName: String(
      value.employeeName ??
        employee.fullName ??
        `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() ??
        "Çalışan",
    ),
    quantity: Number(value.quantity ?? value.qty ?? 1),
    unitPrice: Number(value.unitPrice ?? value.price ?? value.finalPrice ?? 0),
    finalPrice: Number(
      value.finalPrice ?? value.lineTotal ?? value.totalPrice ?? value.totalAmount ?? 0,
    ),
  };
}

function normalizePayment(value: unknown) {
  const row = value as Record<string, unknown>;
  return {
    method: String(
      row.method ?? row.paymentMethod ?? row.type ?? "CASH",
    ) as PaymentMethod,
    amount: Number(row.amount ?? row.paidAmount ?? row.total ?? 0),
  };
}

export function normalizeSale(value: unknown): Sale {
  const row = (value ?? {}) as Record<string, unknown>;
  const customer = (row.customer ?? {}) as Record<string, unknown>;
  const sourceAppointment = (row.sourceAppointment ?? row.appointment ?? {}) as Record<
    string,
    unknown
  >;
  const rawItems = unwrapList<Record<string, unknown>>(
    row.items ?? row.saleItems ?? row.lines,
  );
  const items = rawItems.map(normalizeItem);
  return {
    id: Number(row.id),
    salonId: Number(row.salonId),
    customerId: Number(row.customerId ?? customer.id),
    customerName: String(
      row.customerName ??
        customer.fullName ??
        `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() ??
        "Müşteri",
    ),
    sourceAppointmentId:
      row.sourceAppointmentId != null
        ? Number(row.sourceAppointmentId)
        : row.appointmentId != null
          ? Number(row.appointmentId)
          : sourceAppointment.id != null
            ? Number(sourceAppointment.id)
            : null,
    status: String(row.status ?? "OPEN") as SaleStatus,
    items,
    totalAmount: Number(
      row.totalAmount ??
        row.finalPrice ??
        items.reduce(
          (sum, item) =>
            sum + Number(item.finalPrice || Number(item.unitPrice) * item.quantity),
          0,
        ),
    ),
    payments: (() => {
      const payments = unwrapList<unknown>(
        row.payments ?? row.salePayments ?? row.paymentDetails,
      ).map(normalizePayment);
      if (payments.length) return payments;
      return row.paymentMethod
        ? [
            normalizePayment({
              method: row.paymentMethod,
              amount: row.paidAmount ?? row.totalAmount,
            }),
          ]
        : [];
    })(),
    createdAt: String(row.createdAt ?? row.saleDate ?? new Date().toISOString()),
    completedAt: row.completedAt ? String(row.completedAt) : null,
  };
}

export async function listSales(params: {
  salonId?: number;
  status?: SaleStatus;
  from?: string;
  to?: string;
  employeeId?: number;
}) {
  const { data } = await api.get("/api/sales", { params });
  return unwrapList<unknown>(data).map(normalizeSale);
}

export async function getSale(id: number) {
  const { data } = await api.get(`/api/sales/${id}`);
  return normalizeSale(data);
}

export async function createSale(body: SaleRequest) {
  const { data } = await api.post("/api/sales", body);
  return normalizeSale(data);
}

export async function updateSale(id: number, body: SaleRequest) {
  const { data } = await api.put(`/api/sales/${id}`, body);
  return normalizeSale(data);
}

export async function completeSale(id: number, body: CompleteSaleRequest) {
  const { data } = await api.post(`/api/sales/${id}/complete`, body);
  return normalizeSale(data);
}

export async function cancelSale(id: number) {
  const { data } = await api.post(`/api/sales/${id}/cancel`);
  return normalizeSale(data);
}

export async function listAvailableSaleAppointments(salonId?: number) {
  const { data } = await api.get("/api/sales/available-appointments", {
    params: salonId != null ? { salonId } : undefined,
  });
  return unwrapList<Appointment | Record<string, unknown>>(data).map((raw) => {
    const row = raw as Appointment & Record<string, unknown>;
    return {
      id: Number(row.id),
      salonId: Number(row.salonId),
      customerId: Number(row.customerId),
      customerName: String(row.customerName ?? ""),
      hairServiceId: Number(row.hairServiceId ?? row.serviceId),
      hairServiceName: String(row.hairServiceName ?? row.serviceName ?? ""),
      employeeId: Number(row.employeeId),
      employeeName: String(row.employeeName ?? ""),
      finalPrice: Number(row.finalPrice ?? row.hairServicePrice ?? 0),
      appointmentDateTime: String(row.appointmentDateTime ?? row.createdAt ?? ""),
    } satisfies AvailableSaleAppointment;
  });
}
