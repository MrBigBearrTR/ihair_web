import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  Banknote,
  CalendarRange,
  ChartNoAxesCombined,
  ReceiptText,
  Scissors,
} from "lucide-react";
import { useState } from "react";

import { listEmployees } from "@/api/employees";
import { getRevenueReport } from "@/api/reports";
import { listSales } from "@/api/sales";
import { EmptyState } from "@/components/common/EmptyState";
import { SaleDetailDialog } from "@/components/sales/SaleDetailDialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/common/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useAuthStore } from "@/stores/authStore";
import type { RevenueGrouping } from "@/types/domain";

const paymentLabels = {
  CASH: "Nakit",
  CARD: "Kart",
  BANK_TRANSFER: "Havale / EFT",
};

export function RevenuePage() {
  const activeSalonId = useAuthStore((state) => state.activeSalonId);
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 29), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [employeeId, setEmployeeId] = useState("all");
  const [grouping, setGrouping] = useState<RevenueGrouping>("daily");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const employeesQuery = useQuery({
    queryKey: ["employees", activeSalonId],
    queryFn: () => listEmployees(activeSalonId!),
    enabled: activeSalonId != null,
  });
  const reportQuery = useQuery({
    queryKey: [
      "revenue",
      activeSalonId,
      startDate,
      endDate,
      employeeId,
      grouping,
    ],
    queryFn: () =>
      getRevenueReport({
        salonId: activeSalonId ?? undefined,
        startDate,
        endDate,
        employeeId: employeeId === "all" ? undefined : Number(employeeId),
        grouping,
      }),
    enabled: Boolean(startDate && endDate),
  });
  const report = reportQuery.data;
  const maxRevenue = Math.max(...(report?.groups.map((row) => row.revenue) ?? [0]), 1);

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
            <ChartNoAxesCombined className="size-5" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Gelir raporu</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Geliri tarih, salon ve çalışan bazında karşılaştırın.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="startDate">Başlangıç</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="endDate">Bitiş</Label>
            <Input
              id="endDate"
              type="date"
              min={startDate}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Çalışan</Label>
            <Select
              value={employeeId}
              disabled={activeSalonId == null}
              onValueChange={setEmployeeId}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm çalışanlar</SelectItem>
                {(employeesQuery.data ?? []).map((employee) => (
                  <SelectItem key={employee.id} value={String(employee.id)}>
                    {employee.firstName} {employee.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Gruplama</Label>
            <Select
              value={grouping}
              onValueChange={(value) => setGrouping(value as RevenueGrouping)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Günlük</SelectItem>
                <SelectItem value="monthly">Aylık</SelectItem>
                <SelectItem value="employee">Çalışana göre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Toplam gelir"
          value={formatMoney(report?.summary.totalRevenue ?? 0)}
          icon={Banknote}
        />
        <SummaryCard
          label="Satış sayısı"
          value={String(report?.summary.saleCount ?? 0)}
          icon={ReceiptText}
        />
        <SummaryCard
          label="Ortalama satış"
          value={formatMoney(report?.summary.averageSale ?? 0)}
          icon={CalendarRange}
        />
        <SummaryCard
          label="Verilen hizmet"
          value={String(report?.summary.serviceCount ?? 0)}
          icon={Scissors}
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Gelir dağılımı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(report?.groups ?? []).map((row) => (
              <div key={row.key} className="space-y-1.5">
                <div className="flex justify-between gap-3 text-sm">
                  {grouping === "daily" ? (
                    <button
                      type="button"
                      className="font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setSelectedDay(row.key)}
                    >
                      {row.label}
                    </button>
                  ) : (
                    <span className="font-medium">{row.label}</span>
                  )}
                  <span>{formatMoney(row.revenue)}</span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${(row.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {!reportQuery.isLoading && !report?.groups.length ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Bu tarih aralığında gelir bulunamadı.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ödeme dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              rows={report?.payments ?? []}
              isLoading={reportQuery.isLoading}
              getRowId={(row) => row.method}
              columns={[
                {
                  id: "method",
                  header: "Yöntem",
                  cell: (row) => paymentLabels[row.method] ?? row.method,
                },
                {
                  id: "count",
                  header: "İşlem",
                  cell: (row) => row.count,
                },
                {
                  id: "amount",
                  header: "Tutar",
                  cell: (row) => formatMoney(row.amount),
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
      <DailySalesDialog
        day={selectedDay}
        salonId={activeSalonId ?? undefined}
        employeeId={employeeId === "all" ? undefined : Number(employeeId)}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      />
    </div>
  );
}

function DailySalesDialog({
  day,
  salonId,
  employeeId,
  onOpenChange,
}: {
  day: string | null;
  salonId?: number;
  employeeId?: number;
  onOpenChange: (open: boolean) => void;
}) {
  const [saleId, setSaleId] = useState<number | null>(null);
  const normalizedDay = day?.slice(0, 10) ?? "";
  const query = useQuery({
    queryKey: ["sales", "daily-detail", salonId, normalizedDay, employeeId],
    queryFn: () =>
      listSales({
        salonId,
        status: "COMPLETED",
        from: normalizedDay,
        to: normalizedDay,
        employeeId,
      }),
    enabled: Boolean(day && normalizedDay),
  });

  return (
    <>
      <Dialog open={day != null} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Günlük satışlar</DialogTitle>
            <DialogDescription>
              {normalizedDay || "Seçili gün"} tarihindeki tamamlanmış satışlar.
            </DialogDescription>
          </DialogHeader>
          <DataTable
            rows={query.data ?? []}
            isLoading={query.isLoading}
            getRowId={(row) => row.id}
            empty={
              <EmptyState
                title="Satış bulunamadı"
                description="Bu gün ve filtreler için tamamlanmış satış yok."
              />
            }
            columns={[
              {
                id: "date",
                header: "Tarih",
                cell: (row) => formatDateTime(row.completedAt ?? row.createdAt),
              },
              {
                id: "customer",
                header: "Müşteri",
                cell: (row) => row.customerName,
              },
              {
                id: "total",
                header: "Toplam",
                cell: (row) => formatMoney(row.totalAmount),
              },
              {
                id: "action",
                header: "",
                className: "text-right",
                cell: (row) => (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSaleId(row.id)}
                  >
                    Detay
                  </Button>
                ),
              },
            ]}
          />
        </DialogContent>
      </Dialog>
      <SaleDetailDialog
        saleId={saleId}
        onOpenChange={(open) => !open && setSaleId(null)}
      />
    </>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Banknote;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
