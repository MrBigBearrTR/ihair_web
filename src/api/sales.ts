import { api } from "@/api/client";
import type {
  Appointment,
  AvailableSaleAppointment,
  CompleteSaleRequest,
  Sale,
  SaleListItem,
  SaleItem,
  SaleQuote,
  SaleQuoteItem,
  SaleRequest,
  SaleStatus,
  DiscountType,
  PaymentMethod,
  PagedResponse,
} from "@/types/domain";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

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
  const rawService = value.hairService ?? value.service;
  const rawEmployee = value.employee;
  const service = isRecord(rawService) ? rawService : {};
  const employee = isRecord(rawEmployee) ? rawEmployee : {};
  const quantity = Number(value.quantity ?? value.qty ?? 1);
  const unitPrice = Number(value.unitPrice ?? value.price ?? value.finalPrice ?? 0);
  const lineTotal = Number(
    value.lineTotal ?? value.finalPrice ?? value.totalPrice ?? value.totalAmount ?? unitPrice * quantity,
  );
  const discountShare = Number(value.discountShare ?? 0);
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
    quantity,
    unitPrice,
    finalPrice: lineTotal,
    lineTotal,
    discountShare,
    netLineTotal: Number(value.netLineTotal ?? lineTotal - discountShare),
    position: value.position == null ? undefined : Number(value.position),
  };
}

function normalizeCampaignFields(row: Record<string, unknown>) {
  return {
    campaignId: row.campaignId == null ? null : Number(row.campaignId),
    campaignCode: row.campaignCode == null ? null : String(row.campaignCode),
    campaignName: row.campaignName == null ? null : String(row.campaignName),
    campaignDiscountType:
      row.campaignDiscountType == null
        ? null
        : (String(row.campaignDiscountType) as DiscountType),
    campaignDiscountValue:
      row.campaignDiscountValue == null ? null : Number(row.campaignDiscountValue),
  };
}

function normalizePayment(row: Record<string, unknown>) {
  return {
    method: String(
      row.method ?? row.paymentMethod ?? row.type ?? "CASH",
    ) as PaymentMethod,
    amount: Number(row.amount ?? row.paidAmount ?? row.total ?? 0),
  };
}

export function normalizeSale(value: unknown): Sale {
  const row = isRecord(value) ? value : {};
  const customer = isRecord(row.customer) ? row.customer : {};
  const rawSourceAppointment = row.sourceAppointment ?? row.appointment;
  const sourceAppointment = isRecord(rawSourceAppointment)
    ? rawSourceAppointment
    : {};
  const rawItems = unwrapList<Record<string, unknown>>(
    row.items ?? row.saleItems ?? row.lines,
  ).filter(isRecord);
  const items = rawItems.map(normalizeItem);
  const subtotal = Number(
    row.subtotal ?? items.reduce((sum, item) => sum + Number(item.lineTotal), 0),
  );
  const discountAmount = Number(row.discountAmount ?? 0);
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
    subtotal,
    discountAmount,
    totalAmount: Number(
      row.totalAmount ??
        row.finalPrice ??
        Math.max(0, subtotal - discountAmount),
    ),
    ...normalizeCampaignFields(row),
    campaignAppliedAt:
      row.campaignAppliedAt == null ? null : String(row.campaignAppliedAt),
    notes: row.notes == null ? null : String(row.notes),
    payments: (() => {
      const payments = unwrapList<unknown>(
        row.payments ?? row.salePayments ?? row.paymentDetails,
      )
        .filter(isRecord)
        .map(normalizePayment);
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

function normalizeSaleListItem(value: unknown): SaleListItem {
  const row = isRecord(value) ? value : {};
  const customer = isRecord(row.customer) ? row.customer : {};
  const subtotal = Number(row.subtotal ?? row.totalAmount ?? 0);
  const discountAmount = Number(row.discountAmount ?? 0);
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
      row.sourceAppointmentId == null ? null : Number(row.sourceAppointmentId),
    status: String(row.status ?? "OPEN") as SaleStatus,
    subtotal,
    discountAmount,
    totalAmount: Number(row.totalAmount ?? subtotal - discountAmount),
    ...normalizeCampaignFields(row),
    campaignAppliedAt: null,
    notes: row.notes == null ? null : String(row.notes),
    createdAt: String(row.createdAt ?? ""),
    completedAt: row.completedAt == null ? null : String(row.completedAt),
  };
}

export async function listSalesPaged(params: {
  salonId?: number;
  status?: SaleStatus;
  from?: string;
  to?: string;
  employeeId?: number;
  page: number;
  size: number;
}): Promise<PagedResponse<SaleListItem>> {
  const { data } = await api.get("/api/sales/paged", { params });
  const row = isRecord(data) ? data : {};
  return {
    content: unwrapList<unknown>(row.content)
      .filter(isRecord)
      .map(normalizeSaleListItem),
    page: Number(row.page ?? params.page),
    size: Number(row.size ?? params.size),
    totalElements: Number(row.totalElements ?? 0),
    totalPages: Number(row.totalPages ?? 0),
    first: Boolean(row.first),
    last: Boolean(row.last),
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
  return unwrapList<unknown>(data).filter(isRecord).map(normalizeSale);
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

function normalizeQuoteItem(value: Record<string, unknown>): SaleQuoteItem {
  const item = normalizeItem(value);
  return {
    serviceId: item.hairServiceId,
    employeeId: item.employeeId,
    quantity: item.quantity,
    position: item.position ?? 0,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    discountShare: item.discountShare,
    netLineTotal: item.netLineTotal,
    serviceName: item.hairServiceName,
    employeeName: item.employeeName,
  };
}

function normalizeSaleQuote(value: unknown): SaleQuote {
  const row = isRecord(value) ? value : {};
  return {
    subtotal: Number(row.subtotal ?? 0),
    discountAmount: Number(row.discountAmount ?? 0),
    totalAmount: Number(row.totalAmount ?? 0),
    ...normalizeCampaignFields(row),
    inheritedFromAppointment: Boolean(row.inheritedFromAppointment),
    items: unwrapList<unknown>(row.items)
      .filter(isRecord)
      .map(normalizeQuoteItem),
  };
}

export async function quoteSale(body: SaleRequest) {
  const { data } = await api.post("/api/sales/quote", body);
  return normalizeSaleQuote(data);
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
  return unwrapList<Appointment | Record<string, unknown>>(data)
    .filter(isRecord)
    .map((row) => {
    return {
      id: Number(row.id),
      salonId: Number(row.salonId),
      customerId: Number(row.customerId),
      customerName: String(row.customerName ?? ""),
      hairServiceId: Number(row.hairServiceId ?? row.serviceId),
      hairServiceName: String(row.hairServiceName ?? row.serviceName ?? ""),
      employeeId: Number(row.employeeId),
      employeeName: String(row.employeeName ?? ""),
      campaignCode: row.campaignCode == null ? null : String(row.campaignCode),
      hairServicePrice: Number(row.hairServicePrice ?? row.finalPrice ?? 0),
      finalPrice: Number(row.finalPrice ?? row.hairServicePrice ?? 0),
      appointmentDateTime: String(row.appointmentDateTime ?? row.createdAt ?? ""),
    } satisfies AvailableSaleAppointment;
  });
}
