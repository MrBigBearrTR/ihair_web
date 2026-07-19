import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CalendarCheck,
  Clock3,
  History,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/api/client";
import {
  cancelSale,
  listAvailableSaleAppointments,
  listSalesPaged,
} from "@/api/sales";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { PaginationControls } from "@/components/common/PaginationControls";
import { SaleWorkspace } from "@/components/sales/SaleWorkspace";
import { SaleDetailDialog } from "@/components/sales/SaleDetailDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime, formatMoney } from "@/lib/format";
import { cacheTimes, queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/stores/authStore";
import type { SaleListItem } from "@/types/domain";

const sections = [
  { value: "new", label: "Yeni satış", icon: Plus },
  { value: "pending", label: "Bekleyen işlemler", icon: Clock3 },
  { value: "appointments", label: "Randevulardan getir", icon: CalendarCheck },
  { value: "history", label: "Satış geçmişi", icon: History },
] as const;

export function SalesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeSalonId = useAuthStore((state) => state.activeSalonId);
  const section = location.pathname.split("/")[2] || "new";
  const saleId = Number(searchParams.get("saleId")) || undefined;
  const appointmentId = Number(searchParams.get("appointmentId")) || undefined;

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
            <ShoppingBag className="size-5" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Satışlar</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Müşteriyi seçin, hizmetleri ekleyin ve ödemeyi kolayca tamamlayın.
        </p>
      </div>

      <Tabs
        value={section}
        onValueChange={(value) => navigate(`/sales/${value}`)}
      >
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl p-1">
          {sections.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="min-h-11 min-w-fit px-4"
            >
              <item.icon />
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {section === "new" ? (
        <SaleWorkspace
          key={`${activeSalonId ?? "all"}-${
            saleId != null
              ? `sale-${saleId}`
              : appointmentId != null
                ? `appointment-${appointmentId}`
                : "new"
          }`}
          saleId={saleId}
          appointmentId={appointmentId}
          onFinished={() => navigate("/sales/history")}
        />
      ) : null}
      {section === "pending" ? (
        <PendingSales salonId={activeSalonId ?? undefined} />
      ) : null}
      {section === "appointments" ? (
        <AvailableAppointments salonId={activeSalonId ?? undefined} />
      ) : null}
      {section === "history" ? (
        <SalesHistory salonId={activeSalonId ?? undefined} />
      ) : null}
    </div>
  );
}

function PendingSales({ salonId }: { salonId?: number }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [cancelling, setCancelling] = useState<SaleListItem | null>(null);
  const filters = { salonId, status: "OPEN" as const, page, size: 25 };
  const query = useQuery({
    queryKey: queryKeys.sales.list(filters),
    queryFn: () => listSalesPaged(filters),
    placeholderData: keepPreviousData,
    staleTime: cacheTimes.transactionList,
  });
  const mutation = useMutation({
    mutationFn: cancelSale,
    onSuccess: async (sale) => {
      toast.success("Bekleyen satış iptal edildi");
      setCancelling(null);
      qc.setQueryData(queryKeys.sales.detail(sale.id), sale);
      await qc.invalidateQueries({ queryKey: queryKeys.sales.lists(salonId) });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Bekleyen işlemler</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={query.data?.content ?? []}
            isLoading={query.isLoading}
            getRowId={(row) => row.id}
            empty={
              <EmptyState
                title="Bekleyen satış yok"
                description="Beklemeye aldığınız satışlar burada görünür."
              />
            }
            columns={[
              {
                id: "date",
                header: "Başlangıç",
                priority: "secondary",
                cell: (row) => formatDateTime(row.createdAt),
              },
              {
                id: "customer",
                header: "Müşteri",
                priority: "primary",
                cell: (row) => row.customerName,
              },
              {
                id: "total",
                header: "Toplam",
                priority: "primary",
                cell: (row) => formatMoney(row.totalAmount),
              },
              {
                id: "actions",
                header: "",
                priority: "action",
                mobileLabel: false,
                className: "text-right",
                cell: (row) => (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/sales/new?saleId=${row.id}`)}
                    >
                      <Pencil />
                      Aç
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCancelling(row)}
                    >
                      <Trash2 />
                      İptal
                    </Button>
                  </div>
                ),
              },
            ]}
          />
          <PaginationControls
            page={query.data?.page ?? page}
            totalPages={query.data?.totalPages ?? 0}
            totalElements={query.data?.totalElements ?? 0}
            isFetching={query.isFetching}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Bekleyen satışı iptal et?"
        description="Bu işlem satış kaydını iptal durumuna alır."
        confirmText="Satışı iptal et"
        destructive
        isLoading={mutation.isPending}
        onConfirm={async () => {
          if (cancelling) await mutation.mutateAsync(cancelling.id);
        }}
      />
    </>
  );
}

function AvailableAppointments({ salonId }: { salonId?: number }) {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: queryKeys.sales.availableAppointments(salonId ?? 0),
    queryFn: () => listAvailableSaleAppointments(salonId),
    enabled: salonId != null,
    staleTime: cacheTimes.transactionList,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Satışa hazır randevular</CardTitle>
      </CardHeader>
      <CardContent>
        {salonId == null ? (
          <EmptyState
            title="Önce salon seçin"
            description="Satışa aktarılacak randevuları görmek için üst menüden bir salon seçin."
          />
        ) : (
          <DataTable
            rows={query.data ?? []}
            isLoading={query.isLoading}
            getRowId={(row) => row.id}
            empty={
              <EmptyState
                title="Uygun randevu yok"
                description="Bekleyen, onaylanan veya gelmiş ve henüz satışa dönüşmemiş randevular burada görünür."
              />
            }
            columns={[
            {
              id: "date",
              header: "Randevu",
              priority: "secondary",
              cell: (row) => formatDateTime(row.appointmentDateTime),
            },
            {
              id: "customer",
              header: "Müşteri",
              priority: "primary",
              cell: (row) => row.customerName,
            },
            {
              id: "service",
              header: "Hizmet",
              priority: "primary",
              cell: (row) => row.hairServiceName,
            },
            {
              id: "employee",
              header: "Çalışan",
              priority: "detail",
              cell: (row) => row.employeeName,
            },
            {
              id: "total",
              header: "Tutar",
              priority: "secondary",
              cell: (row) => formatMoney(row.finalPrice),
            },
            {
              id: "action",
              header: "",
              priority: "action",
              mobileLabel: false,
              className: "text-right",
              cell: (row) => (
                <Button
                  size="sm"
                  onClick={() => navigate(`/sales/new?appointmentId=${row.id}`)}
                >
                  Satışa getir
                </Button>
              ),
            },
            ]}
          />
        )}
      </CardContent>
    </Card>
  );
}

function SalesHistory({ salonId }: { salonId?: number }) {
  const [detailId, setDetailId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const filters = { salonId, status: "COMPLETED" as const, page, size: 25 };
  const query = useQuery({
    queryKey: queryKeys.sales.list(filters),
    queryFn: () => listSalesPaged(filters),
    placeholderData: keepPreviousData,
    staleTime: cacheTimes.transactionList,
  });
  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Satış geçmişi</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          rows={query.data?.content ?? []}
          isLoading={query.isLoading}
          getRowId={(row) => row.id}
          empty={
            <EmptyState
              title="Tamamlanmış satış yok"
              description="Tamamlanan ödemeler burada listelenir."
            />
          }
          columns={[
            {
              id: "date",
              header: "Tarih",
              priority: "secondary",
              cell: (row) => formatDateTime(row.completedAt ?? row.createdAt),
            },
            {
              id: "customer",
              header: "Müşteri",
              priority: "primary",
              cell: (row) => row.customerName,
            },
            {
              id: "subtotal",
              header: "Brüt",
              priority: "detail",
              cell: (row) => formatMoney(row.subtotal),
            },
            {
              id: "discount",
              header: "İndirim",
              priority: "secondary",
              cell: (row) => `-${formatMoney(row.discountAmount)}`,
            },
            {
              id: "total",
              header: "Net",
              priority: "primary",
              cell: (row) => formatMoney(row.totalAmount),
            },
            {
              id: "actions",
              header: "",
              priority: "action",
              mobileLabel: false,
              className: "text-right",
              cell: (row) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDetailId(row.id)}
                >
                  Detay
                </Button>
              ),
            },
          ]}
        />
        <PaginationControls
          page={query.data?.page ?? page}
          totalPages={query.data?.totalPages ?? 0}
          totalElements={query.data?.totalElements ?? 0}
          isFetching={query.isFetching}
          onPageChange={setPage}
        />
      </CardContent>
    </Card>
    <SaleDetailDialog
      saleId={detailId}
      onOpenChange={(open) => !open && setDetailId(null)}
    />
    </>
  );
}
