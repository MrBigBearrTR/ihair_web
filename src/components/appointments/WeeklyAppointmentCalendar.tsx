import {
  addDays,
  differenceInMinutes,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
} from "date-fns";
import { tr } from "date-fns/locale";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/labels";
import type {
  Appointment,
  AppointmentStatus,
  SalonSchedule,
} from "@/types/domain";

const dayLabels = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];
const pixelsPerMinute = 1;
const startHour = 7;
const endHour = 22;
const gridHeight = (endHour - startHour) * 60 * pixelsPerMinute;

const statusClasses: Record<AppointmentStatus, string> = {
  PENDING: "border-amber-400/60 bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
  CONFIRMED: "border-blue-400/60 bg-blue-100 text-blue-950 dark:bg-blue-950 dark:text-blue-100",
  COMPLETED: "border-emerald-400/60 bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100",
  CANCELLED: "border-slate-400/60 bg-slate-100 text-slate-600 line-through dark:bg-slate-900 dark:text-slate-300",
};

function dateKey(value: Date | string) {
  return format(typeof value === "string" ? parseISO(value) : value, "yyyy-MM-dd");
}

function appointmentEnd(appointment: Appointment) {
  const explicit = appointment.endDateTime ?? appointment.endsAt;
  if (explicit) return parseISO(explicit);
  return new Date(
    parseISO(appointment.appointmentDateTime).getTime() +
      (appointment.durationMinutes || 60) * 60_000,
  );
}

function holidayFor(date: Date, schedule: SalonSchedule) {
  const day = startOfDay(date);
  return schedule.holidays.find((holiday) => {
    if (!holiday.startDate || !holiday.endDate) return false;
    return isWithinInterval(day, {
      start: startOfDay(parseISO(holiday.startDate)),
      end: startOfDay(parseISO(holiday.endDate)),
    });
  });
}

export function WeeklyAppointmentCalendar({
  weekStart,
  appointments,
  schedule,
  onSelectAppointment,
}: {
  weekStart: Date;
  appointments: Appointment[];
  schedule: SalonSchedule;
  onSelectAppointment: (id: number) => void;
}) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const todayIndex = days.findIndex(
    (day) => dateKey(day) === format(new Date(), "yyyy-MM-dd"),
  );
  const [mobileDay, setMobileDay] = useState(todayIndex >= 0 ? todayIndex : 0);

  const byDay = days.map((day) =>
    appointments
      .filter((appointment) => dateKey(appointment.appointmentDateTime) === dateKey(day))
      .sort((a, b) => a.appointmentDateTime.localeCompare(b.appointmentDateTime)),
  );

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <div className="min-w-[1050px]">
          <div className="grid grid-cols-[64px_repeat(7,minmax(138px,1fr))] border-b">
            <div className="bg-muted/40" />
            {days.map((day, index) => (
              <div
                key={dateKey(day)}
                className={cn(
                  "border-l px-2 py-3 text-center",
                  index === todayIndex && "bg-primary/5",
                )}
              >
                <p className="text-sm font-medium">{dayLabels[index]}</p>
                <p className="text-muted-foreground text-xs">
                  {format(day, "d MMMM", { locale: tr })}
                </p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[64px_repeat(7,minmax(138px,1fr))]">
            <div className="relative" style={{ height: gridHeight }}>
              {Array.from({ length: endHour - startHour + 1 }, (_, index) => (
                <span
                  key={index}
                  className="text-muted-foreground absolute right-2 -translate-y-2 text-[11px]"
                  style={{ top: index * 60 }}
                >
                  {String(startHour + index).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            {days.map((day, dayIndex) => {
              const daySchedule = schedule.days[dayIndex];
              const holiday = holidayFor(day, schedule);
              const closed = !daySchedule?.open || Boolean(holiday);
              return (
                <div
                  key={dateKey(day)}
                  className={cn(
                    "relative border-l bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_59px,var(--border)_60px)]",
                    dayIndex === todayIndex && "bg-primary/[0.025]",
                  )}
                  style={{ height: gridHeight }}
                >
                  {closed ? (
                    <div className="bg-muted/75 absolute inset-0 z-[1] flex items-start justify-center p-3 text-center text-xs">
                      <span className="rounded-md bg-background/90 px-2 py-1">
                        {holiday?.description || "Kapalı"}
                      </span>
                    </div>
                  ) : (
                    <>
                      <ClosedHours
                        opensAt={daySchedule.opensAt}
                        closesAt={daySchedule.closesAt}
                      />
                      <span className="text-muted-foreground absolute top-1 left-1 z-[2] text-[10px]">
                        {daySchedule.opensAt}–{daySchedule.closesAt}
                      </span>
                    </>
                  )}
                  {byDay[dayIndex].map((appointment) => {
                    const start = parseISO(appointment.appointmentDateTime);
                    const top =
                      (start.getHours() * 60 +
                        start.getMinutes() -
                        startHour * 60) *
                      pixelsPerMinute;
                    const duration = Math.max(
                      30,
                      differenceInMinutes(appointmentEnd(appointment), start),
                    );
                    return (
                      <button
                        key={appointment.id}
                        type="button"
                        className={cn(
                          "absolute right-1 left-1 z-10 overflow-hidden rounded-lg border p-1.5 text-left text-xs shadow-sm transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring",
                          statusClasses[appointment.status],
                        )}
                        style={{
                          top: Math.max(0, top),
                          height: Math.min(duration, gridHeight - Math.max(0, top)),
                        }}
                        aria-label={`${format(start, "HH:mm")} ${appointment.customerName}, ${appointment.hairServiceName}, ${APPOINTMENT_STATUS_LABELS[appointment.status]}`}
                        onClick={() => onSelectAppointment(appointment.id)}
                      >
                        <span className="block font-semibold">
                          {format(start, "HH:mm")} {appointment.customerName}
                        </span>
                        <span className="block truncate">{appointment.hairServiceName}</span>
                        <span className="block truncate">
                          {APPOINTMENT_STATUS_LABELS[appointment.status]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Takvim günü"
        >
          {days.map((day, index) => (
            <Button
              key={dateKey(day)}
              type="button"
              role="tab"
              aria-selected={mobileDay === index}
              variant={mobileDay === index ? "default" : "outline"}
              className="h-auto min-w-16 flex-col py-2"
              onClick={() => setMobileDay(index)}
            >
              <span className="text-xs">{dayLabels[index].slice(0, 3)}</span>
              <span>{format(day, "d")}</span>
            </Button>
          ))}
        </div>
        <MobileAgenda
          date={days[mobileDay]}
          dayIndex={mobileDay}
          appointments={byDay[mobileDay]}
          schedule={schedule}
          onSelectAppointment={onSelectAppointment}
        />
      </div>
    </>
  );
}

function ClosedHours({
  opensAt,
  closesAt,
}: {
  opensAt: string;
  closesAt: string;
}) {
  const [openHour, openMinute] = opensAt.split(":").map(Number);
  const [closeHour, closeMinute] = closesAt.split(":").map(Number);
  const openTop = Math.max(0, (openHour * 60 + openMinute - startHour * 60));
  const closeTop = Math.min(
    gridHeight,
    closeHour * 60 + closeMinute - startHour * 60,
  );
  return (
    <>
      <div className="bg-muted/60 absolute inset-x-0 top-0" style={{ height: openTop }} />
      <div
        className="bg-muted/60 absolute inset-x-0 bottom-0"
        style={{ top: closeTop }}
      />
    </>
  );
}

function MobileAgenda({
  date,
  dayIndex,
  appointments,
  schedule,
  onSelectAppointment,
}: {
  date: Date;
  dayIndex: number;
  appointments: Appointment[];
  schedule: SalonSchedule;
  onSelectAppointment: (id: number) => void;
}) {
  const daySchedule = schedule.days[dayIndex];
  const holiday = holidayFor(date, schedule);
  return (
    <div className="space-y-2">
      <div className="bg-muted/50 rounded-lg border px-3 py-2 text-sm">
        {holiday
          ? `Tatil: ${holiday.description || "Salon kapalı"}`
          : daySchedule?.open
            ? `Çalışma saatleri: ${daySchedule.opensAt}–${daySchedule.closesAt}`
            : "Salon kapalı"}
      </div>
      {appointments.length ? (
        appointments.map((appointment) => (
          <button
            key={appointment.id}
            type="button"
            className={cn(
              "w-full rounded-xl border p-3 text-left shadow-sm focus-visible:ring-2 focus-visible:ring-ring",
              statusClasses[appointment.status],
            )}
            onClick={() => onSelectAppointment(appointment.id)}
          >
            <div className="flex justify-between gap-3">
              <span className="font-semibold">
                {format(parseISO(appointment.appointmentDateTime), "HH:mm")}
              </span>
              <span className="text-xs">
                {APPOINTMENT_STATUS_LABELS[appointment.status]}
              </span>
            </div>
            <p className="mt-1">{appointment.customerName}</p>
            <p className="text-sm opacity-80">
              {appointment.hairServiceName} · {appointment.employeeName}
            </p>
          </button>
        ))
      ) : (
        <p className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
          Bu gün için randevu yok.
        </p>
      )}
    </div>
  );
}
