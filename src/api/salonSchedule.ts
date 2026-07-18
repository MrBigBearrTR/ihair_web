import { api } from "@/api/client";
import type {
  SalonHoliday,
  SalonHolidayRequest,
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

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    for (const key of ["content", "items", "data", "holidays"]) {
      if (Array.isArray(row[key])) return row[key] as unknown[];
    }
  }
  return [];
}

function normalizeHoliday(value: unknown): SalonHoliday {
  const row = value as Record<string, unknown>;
  return {
    id: Number(row.id),
    salonId: row.salonId == null ? undefined : Number(row.salonId),
    startDate: String(row.startDate ?? row.from ?? row.date ?? ""),
    endDate: String(row.endDate ?? row.to ?? row.startDate ?? row.date ?? ""),
    description:
      row.description == null && row.reason == null
        ? null
        : String(row.description ?? row.reason),
  };
}

function normalizeSchedule(value: unknown): SalonSchedule {
  const row = (value ?? {}) as Record<string, unknown>;
  const rawDays = asList(row.days ?? row.workingDays);
  return {
    timeZone: String(row.timeZone ?? row.timezone ?? "Europe/Istanbul"),
    days: weekDays.map((dayOfWeek, index) => {
      const raw = rawDays.find((item) => {
        const day = item as Record<string, unknown>;
        return (
          String(day.dayOfWeek ?? day.day ?? "").toUpperCase() === dayOfWeek ||
          Number(day.dayOfWeek ?? day.day) === index + 1
        );
      }) as Record<string, unknown> | undefined;
      return {
        dayOfWeek,
        open: raw ? Boolean(raw.open ?? raw.isOpen ?? !raw.closed) : true,
        opensAt: String(raw?.opensAt ?? raw?.openTime ?? "09:00").slice(0, 5),
        closesAt: String(raw?.closesAt ?? raw?.closeTime ?? "19:00").slice(0, 5),
      } satisfies SalonScheduleDay;
    }),
    holidays: asList(row.holidays).map(normalizeHoliday),
  };
}

export async function getSalonSchedule(salonId: number) {
  const { data } = await api.get(`/api/salons/${salonId}/schedule`);
  return normalizeSchedule(data);
}

export async function updateSalonSchedule(
  salonId: number,
  body: Pick<SalonSchedule, "timeZone" | "days">,
) {
  const { data } = await api.put(`/api/salons/${salonId}/schedule`, {
    timeZone: body.timeZone,
    days: body.days.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      closed: !day.open,
      opensAt: day.opensAt,
      closesAt: day.closesAt,
    })),
  });
  return normalizeSchedule(data);
}

export async function createSalonHoliday(
  salonId: number,
  body: SalonHolidayRequest,
) {
  const { data } = await api.post(`/api/salons/${salonId}/holidays`, {
    startDate: body.startDate,
    endDate: body.endDate,
    reason: body.description,
  });
  return normalizeHoliday(data);
}

export async function updateSalonHoliday(
  salonId: number,
  holidayId: number,
  body: SalonHolidayRequest,
) {
  const { data } = await api.put(
    `/api/salons/${salonId}/holidays/${holidayId}`,
    {
      startDate: body.startDate,
      endDate: body.endDate,
      reason: body.description,
    },
  );
  return normalizeHoliday(data);
}

export async function deleteSalonHoliday(salonId: number, holidayId: number) {
  await api.delete(`/api/salons/${salonId}/holidays/${holidayId}`);
}
