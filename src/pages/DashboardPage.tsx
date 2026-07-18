import type { ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { addWeeks, format, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import { useMemo, useState } from "react";

import { listAppointmentWeek } from "@/api/appointments";
import { getSalonSchedule } from "@/api/salonSchedule";
import { AppointmentDetailDialog } from "@/components/appointments/AppointmentDetailDialog";
import { WeeklyAppointmentCalendar } from "@/components/appointments/WeeklyAppointmentCalendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { EmptyState } from "@/components/common/EmptyState";

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description ? (
          <CardDescription className="mt-1">{description}</CardDescription>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const role = useAuthStore((s) => s.role);
  const username = useAuthStore((s) => s.username);
  const activeSalonId = useAuthStore((s) => s.activeSalonId);
  const authorizedSalons = useAuthStore((s) => s.authorizedSalons);
  const employeeId = useAuthStore((s) => s.employeeId);
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(
    null,
  );
  const weekStartKey = format(weekStart, "yyyy-MM-dd");

  const weekQuery = useQuery({
    queryKey: ["appointment-week", activeSalonId, weekStartKey],
    queryFn: () => listAppointmentWeek(activeSalonId!, weekStartKey),
    enabled: activeSalonId != null,
  });
  const scheduleQuery = useQuery({
    queryKey: ["salon-schedule", activeSalonId],
    queryFn: () => getSalonSchedule(activeSalonId!),
    enabled: activeSalonId != null,
  });

  const appointments = useMemo(() => {
    const rows = weekQuery.data?.appointments ?? [];
    return role === "EMPLOYEE" && employeeId != null
      ? rows.filter((appointment) => appointment.employeeId === employeeId)
      : rows;
  }, [employeeId, role, weekQuery.data?.appointments]);
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayAppointments = appointments.filter(
    (appointment) =>
      appointment.appointmentDateTime.slice(0, 10) === todayKey &&
      appointment.status !== "CANCELLED",
  );

  if (authorizedSalons.length === 0) {
    return (
      <EmptyState
        title="Yetkili salon bulunamadı"
        description="Panel verilerini görüntülemek için hesabınıza bir salon atanmalıdır."
      />
    );
  }

  if (activeSalonId == null) {
    return (
      <EmptyState
        title="Takvim için salon seçin"
        description="Haftalık randevu takvimini görüntülemek için üst menüden aktif bir salon seçin."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Panel</h1>
        <p className="text-muted-foreground text-sm">
          Hoş geldin{username ? `, ${username}` : ""}.
        </p>
      </div>

      {weekQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Bugünkü toplam"
            value={todayAppointments.length}
            description="İptal edilenler hariç"
            icon={CalendarDays}
          />
          <StatCard
            title="Bekleyen"
            value={todayAppointments.filter((item) => item.status === "PENDING").length}
            description="Bugünkü randevular"
            icon={CalendarClock}
          />
          <StatCard
            title="Onaylanan"
            value={todayAppointments.filter((item) => item.status === "CONFIRMED").length}
            description="Bugünkü randevular"
            icon={CalendarCheck}
          />
          <StatCard
            title="Tamamlanan"
            value={todayAppointments.filter((item) => item.status === "COMPLETED").length}
            description="Bugünkü randevular"
            icon={CheckCircle2}
          />
        </div>
      )}

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Haftalık randevu takvimi</CardTitle>
            <CardDescription>
              {format(weekStart, "d MMMM", { locale: tr })} –{" "}
              {format(addWeeks(weekStart, 1).getTime() - 86_400_000, "d MMMM yyyy", {
                locale: tr,
              })}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Önceki hafta"
              onClick={() => setWeekStart((current) => addWeeks(current, -1))}
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
              }
            >
              Bu hafta
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Sonraki hafta"
              onClick={() => setWeekStart((current) => addWeeks(current, 1))}
            >
              <ChevronRight />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {weekQuery.isError ? (
            <EmptyState
              title="Takvim yüklenemedi"
              description="Haftalık randevular alınırken bir hata oluştu."
            />
          ) : weekQuery.isLoading || !weekQuery.data ? (
            <Skeleton className="h-[560px]" />
          ) : (
            <WeeklyAppointmentCalendar
              weekStart={weekStart}
              appointments={appointments}
              schedule={scheduleQuery.data ?? weekQuery.data.schedule}
              onSelectAppointment={setSelectedAppointmentId}
            />
          )}
        </CardContent>
      </Card>
      <AppointmentDetailDialog
        appointmentId={selectedAppointmentId}
        onOpenChange={(open) => !open && setSelectedAppointmentId(null)}
      />
    </div>
  );
}
