import { api } from "@/api/client";
import type {
  Appointment,
  AppointmentRequest,
  AppointmentStatusRequest,
  AppointmentWeek,
  AppointmentStatus,
  PagedResponse,
  SalonHoliday,
  SalonSchedule,
  SalonScheduleDay,
  WeekDay,
} from "@/types/domain";

const weekDays: WeekDay[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

function unwrapList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    for (const key of ["content", "items", "data", "results", "appointments"]) {
      if (Array.isArray(row[key])) return row[key] as unknown[];
    }
  }
  return [];
}

function normalizeAppointment(value: unknown): Appointment {
  const row = (value ?? {}) as Record<string, unknown>;
  const service = (row.hairService ?? row.service ?? {}) as Record<string, unknown>;
  const customer = (row.customer ?? {}) as Record<string, unknown>;
  const employee = (row.employee ?? {}) as Record<string, unknown>;
  const dateTime = String(
    row.appointmentDateTime ?? row.startsAt ?? row.startDateTime ?? row.dateTime ?? "",
  );
  return {
    id: Number(row.id),
    salonId: Number(row.salonId),
    customerId: Number(row.customerId ?? customer.id),
    customerName: String(
      row.customerName ??
        customer.fullName ??
        `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim(),
    ),
    employeeId: Number(row.employeeId ?? employee.id),
    employeeName: String(
      row.employeeName ??
        employee.fullName ??
        `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim(),
    ),
    hairServiceId: Number(row.hairServiceId ?? row.serviceId ?? service.id),
    hairServiceName: String(
      row.hairServiceName ?? row.serviceName ?? service.name ?? "Hizmet",
    ),
    campaignCode: row.campaignCode == null ? null : String(row.campaignCode),
    appointmentDateTime: dateTime,
    status: String(row.status ?? "PENDING") as Appointment["status"],
    hairServicePrice: Number(row.hairServicePrice ?? service.price ?? 0),
    finalPrice: Number(row.finalPrice ?? row.totalAmount ?? service.price ?? 0),
    notes: row.notes == null ? null : String(row.notes),
    createdAt: String(row.createdAt ?? dateTime),
    durationMinutes:
      row.durationMinutes == null
        ? service.durationMinutes == null
          ? null
          : Number(service.durationMinutes)
        : Number(row.durationMinutes),
    endDateTime:
      row.endDateTime == null
        ? row.endsAt == null
          ? null
          : String(row.endsAt)
        : String(row.endDateTime),
    endsAt: row.endsAt == null ? null : String(row.endsAt),
    scheduleOverridden: Boolean(row.scheduleOverridden),
    version: row.version == null ? null : Number(row.version),
  };
}

function normalizeSchedule(value: unknown): SalonSchedule {
  const row = (value ?? {}) as Record<string, unknown>;
  const rawDays = unwrapList(row.days ?? row.workingDays ?? row.scheduleDays);
  const days = weekDays.map((dayOfWeek, index) => {
    const raw = rawDays.find((item) => {
      const candidate = item as Record<string, unknown>;
      return (
        String(candidate.dayOfWeek ?? candidate.day ?? "").toUpperCase() === dayOfWeek ||
        Number(candidate.dayOfWeek ?? candidate.day) === index + 1
      );
    }) as Record<string, unknown> | undefined;
    return {
      dayOfWeek,
      open: raw ? Boolean(raw.open ?? raw.isOpen ?? !raw.closed) : true,
      opensAt: String(raw?.opensAt ?? raw?.openTime ?? "09:00").slice(0, 5),
      closesAt: String(raw?.closesAt ?? raw?.closeTime ?? "19:00").slice(0, 5),
    } satisfies SalonScheduleDay;
  });
  const holidays = unwrapList(row.holidays).map((item) => {
    const holiday = item as Record<string, unknown>;
    return {
      id: Number(holiday.id),
      salonId: holiday.salonId == null ? undefined : Number(holiday.salonId),
      startDate: String(holiday.startDate ?? holiday.from ?? holiday.date ?? ""),
      endDate: String(
        holiday.endDate ?? holiday.to ?? holiday.startDate ?? holiday.date ?? "",
      ),
      description:
        holiday.description == null && holiday.reason == null
          ? null
          : String(holiday.description ?? holiday.reason),
    } satisfies SalonHoliday;
  });
  return {
    timeZone: String(row.timeZone ?? row.timezone ?? "Europe/Istanbul"),
    days,
    holidays,
  };
}

export async function listAppointments(salonId?: number) {
  const { data } = await api.get("/api/appointments", {
    params: salonId != null ? { salonId } : undefined,
  });
  return unwrapList(data).map(normalizeAppointment);
}

export async function listAppointmentsPaged(params: {
  salonId?: number;
  status?: AppointmentStatus;
  active?: boolean;
  from?: string;
  to?: string;
  page: number;
  size: number;
}): Promise<PagedResponse<Appointment>> {
  const { data } = await api.get("/api/appointments/paged", { params });
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    content: unwrapList(row.content).map(normalizeAppointment),
    page: Number(row.page ?? params.page),
    size: Number(row.size ?? params.size),
    totalElements: Number(row.totalElements ?? 0),
    totalPages: Number(row.totalPages ?? 0),
    first: Boolean(row.first),
    last: Boolean(row.last),
  };
}

export async function getAppointment(id: number) {
  const { data } = await api.get(`/api/appointments/${id}`);
  return normalizeAppointment(data);
}

export async function createAppointment(body: AppointmentRequest) {
  const { data } = await api.post<Appointment>("/api/appointments", body);
  return normalizeAppointment(data);
}

export async function updateAppointment(id: number, body: AppointmentRequest) {
  const { data } = await api.put(`/api/appointments/${id}`, body);
  return normalizeAppointment(data);
}

export async function listAppointmentWeek(
  salonId: number,
  weekStart: string,
): Promise<AppointmentWeek> {
  const { data } = await api.get("/api/appointments/week", {
    params: { salonId, weekStart },
  });
  const row = (data ?? {}) as Record<string, unknown>;
  const scheduleSource =
    row.schedule ?? row.scheduleMetadata ?? row.workingSchedule ?? row;
  return {
    appointments: unwrapList(row.appointments ?? row.data ?? data).map(
      normalizeAppointment,
    ),
    schedule: normalizeSchedule(scheduleSource),
  };
}

export async function updateAppointmentStatus(
  id: number,
  body: AppointmentStatusRequest,
) {
  const { data } = await api.patch<Appointment>(
    `/api/appointments/${id}/status`,
    body,
  );
  return data;
}

export async function deleteAppointment(id: number) {
  await api.delete(`/api/appointments/${id}`);
}
