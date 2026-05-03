import type { ComponentType } from "react";
import { useQueries } from "@tanstack/react-query";
import { CalendarDays, Store, Tag, Users } from "lucide-react";

import { listAppointments } from "@/api/appointments";
import { listCampaigns } from "@/api/campaigns";
import { listCustomers } from "@/api/customers";
import { listSalons } from "@/api/salons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/authStore";

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

  const enabledSalons = role === "ADMIN" || role === "SALON_OWNER";
  const enabledCampaigns = role === "ADMIN" || role === "SALON_OWNER";
  const enabledCustomers =
    role === "ADMIN" || role === "SALON_OWNER" || role === "EMPLOYEE";
  const enabledAppointments =
    role === "ADMIN" || role === "SALON_OWNER" || role === "EMPLOYEE";

  const results = useQueries({
    queries: [
      {
        queryKey: ["salons"],
        queryFn: listSalons,
        enabled: enabledSalons,
      },
      {
        queryKey: ["campaigns"],
        queryFn: listCampaigns,
        enabled: enabledCampaigns,
      },
      {
        queryKey: ["customers"],
        queryFn: listCustomers,
        enabled: enabledCustomers,
      },
      {
        queryKey: ["appointments"],
        queryFn: listAppointments,
        enabled: enabledAppointments,
      },
    ],
  });

  const [salonsQ, campaignsQ, customersQ, appointmentsQ] = results;
  const loading =
    results.some((r) => r.isLoading) || results.some((r) => r.isFetching);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Panel</h1>
        <p className="text-muted-foreground text-sm">
          Hoş geldin{username ? `, ${username}` : ""}.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {enabledSalons ? (
            <StatCard
              title="Salonlar"
              value={salonsQ.data?.length ?? 0}
              description="Aktif salon kayıtları"
              icon={Store}
            />
          ) : null}
          {enabledCampaigns ? (
            <StatCard
              title="Kampanyalar"
              value={campaignsQ.data?.length ?? 0}
              description="Aktif kampanyalar"
              icon={Tag}
            />
          ) : null}
          {enabledCustomers ? (
            <StatCard
              title="Müşteriler"
              value={customersQ.data?.length ?? 0}
              description="Aktif müşteri kayıtları"
              icon={Users}
            />
          ) : null}
          {enabledAppointments ? (
            <StatCard
              title="Randevular"
              value={appointmentsQ.data?.length ?? 0}
              description="İptal edilmemiş randevular"
              icon={CalendarDays}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
