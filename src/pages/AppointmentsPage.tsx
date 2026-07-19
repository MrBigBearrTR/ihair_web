import { zodResolver } from "@hookform/resolvers/zod";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import {
  createAppointment,
  deleteAppointment,
  listAppointmentsPaged,
  updateAppointmentStatus,
} from "@/api/appointments";
import { validateCampaign } from "@/api/campaigns";
import { listCustomers } from "@/api/customers";
import { listEmployees } from "@/api/employees";
import { listHairServices } from "@/api/hairServices";
import { getApiErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { PaginationControls } from "@/components/common/PaginationControls";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDateTime, formatMoney } from "@/lib/format";
import { APPOINTMENT_STATUS_LABELS, DISCOUNT_TYPE_LABELS } from "@/lib/labels";
import { cacheTimes, queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/stores/authStore";
import type {
  Appointment,
  AppointmentRequest,
  AppointmentStatus,
  Campaign,
  DiscountType,
} from "@/types/domain";

function toLocalDateTimeString(dtLocal: string) {
  if (!dtLocal.includes("T")) return dtLocal;
  const [d, t] = dtLocal.split("T");
  const time = t.length === 5 ? `${t}:00` : t;
  return `${d}T${time}`;
}

function requiresOutsideHoursConfirmation(error: unknown) {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) return false;
  const visit = (value: unknown): boolean => {
    if (value === "OUTSIDE_WORKING_HOURS_CONFIRMATION_REQUIRED") return true;
    if (!value || typeof value !== "object") return false;
    return Object.values(value as Record<string, unknown>).some(visit);
  };
  return visit(error.response.data);
}

function previewFinalPrice(
  base: number,
  campaign: Pick<Campaign, "discountType" | "discountValue"> | null,
) {
  if (!campaign) return base;
  const dv = Number(campaign.discountValue);
  switch (campaign.discountType as DiscountType) {
    case "PERCENTAGE":
      return Math.max(0, base * (1 - dv / 100));
    case "FIXED_AMOUNT":
      return Math.max(0, base - dv);
    case "FREE_SESSION":
      return 0;
    default:
      return base;
  }
}

const createSchema = z.object({
  salonId: z.coerce.number().optional(),
  customerId: z.coerce.number().min(1, "Müşteri seçin"),
  employeeId: z.coerce.number().min(1, "Çalışan seçin"),
  hairServiceId: z.coerce.number().min(1, "Hizmet seçin"),
  appointmentDateTime: z.string().min(1, "Tarih/saat seçin"),
  campaignCode: z.string().optional(),
});

type CreateFormInput = z.input<typeof createSchema>;
type CreateForm = z.output<typeof createSchema>;

const statusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "ARRIVED", "COMPLETED", "CANCELLED"]),
});

type StatusForm = z.infer<typeof statusSchema>;

export function AppointmentsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAuthStore((s) => s.role);
  const isAdmin = role === "ADMIN";
  const activeSalonId = useAuthStore((s) => s.activeSalonId);
  const authorizedSalons = useAuthStore((s) => s.authorizedSalons);

  const [openCreate, setOpenCreate] = useState(false);
  const [openStatus, setOpenStatus] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState<Appointment | null>(null);
  const [appointmentView, setAppointmentView] = useState<"active" | "history">(
    "active",
  );
  const [page, setPage] = useState(0);
  const [outsideHoursValues, setOutsideHoursValues] = useState<CreateForm | null>(
    null,
  );

  const customersQuery = useQuery({
    queryKey: queryKeys.reference.customers(activeSalonId ?? undefined),
    queryFn: () => listCustomers(activeSalonId ?? undefined),
    enabled: activeSalonId != null,
    staleTime: cacheTimes.reference,
  });
  const appointmentFilters = {
    salonId: activeSalonId ?? undefined,
    active: appointmentView === "active",
    page,
    size: 25,
  };
  const appointmentsQuery = useQuery({
    queryKey: queryKeys.appointments.list(appointmentFilters),
    queryFn: () => listAppointmentsPaged(appointmentFilters),
    enabled: isAdmin || activeSalonId != null,
    placeholderData: keepPreviousData,
    staleTime: cacheTimes.transactionList,
  });

  const salonIdForForm = activeSalonId ?? 0;

  const createForm = useForm<CreateFormInput, unknown, CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      salonId: 0,
      customerId: 0,
      employeeId: 0,
      hairServiceId: 0,
      appointmentDateTime: "",
      campaignCode: "",
    },
  });

  const statusForm = useForm<StatusForm>({
    resolver: zodResolver(statusSchema),
    defaultValues: { status: "PENDING" },
  });

  const watchedSalonId = Number(createForm.watch("salonId")) || 0;
  const watchedServiceId = Number(createForm.watch("hairServiceId")) || 0;
  const watchedCampaignCode = String(createForm.watch("campaignCode") ?? "");
  const debouncedCampaign = useDebounce(watchedCampaignCode ?? "", 400);

  const effectiveSalonForLists = watchedSalonId || salonIdForForm;

  const employeesScopedQuery = useQuery({
    queryKey: queryKeys.reference.employees(effectiveSalonForLists),
    queryFn: () => listEmployees(effectiveSalonForLists),
    enabled: openCreate && effectiveSalonForLists > 0,
    staleTime: cacheTimes.reference,
  });
  const servicesScopedQuery = useQuery({
    queryKey: queryKeys.reference.hairServices(effectiveSalonForLists),
    queryFn: () => listHairServices(effectiveSalonForLists),
    enabled: openCreate && effectiveSalonForLists > 0,
    staleTime: cacheTimes.reference,
  });

  const selectedService = useMemo(() => {
    const list = servicesScopedQuery.data ?? [];
    return list.find((s) => s.id === watchedServiceId) ?? null;
  }, [servicesScopedQuery.data, watchedServiceId]);

  const basePrice = selectedService ? Number(selectedService.price) : 0;

  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    let cancelled = false;
    const code = debouncedCampaign.trim();
    if (!code) {
      setPreviewCampaign(null);
      return;
    }
    void (async () => {
      try {
        const c = await validateCampaign(code);
        if (!cancelled) setPreviewCampaign(c);
      } catch {
        if (!cancelled) setPreviewCampaign(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedCampaign]);

  const previewPrice = previewFinalPrice(basePrice, previewCampaign);

  useEffect(() => {
    if (!openCreate) return;
    const sid = activeSalonId;
    if (sid) {
      createForm.setValue("salonId", sid, { shouldValidate: true });
    }
  }, [openCreate, activeSalonId, createForm]);

  useEffect(() => {
    const state = location.state as
      | { resumeAppointment?: boolean; customerId?: number }
      | null;
    if (!state?.resumeAppointment) return;

    const rawDraft = sessionStorage.getItem("ihair-appointment-draft");
    if (rawDraft) {
      try {
        const parsed = createSchema.safeParse(JSON.parse(rawDraft));
        if (parsed.success) createForm.reset(parsed.data);
      } catch {
        sessionStorage.removeItem("ihair-appointment-draft");
      }
    }
    if (state.customerId) {
      createForm.setValue("customerId", state.customerId, { shouldValidate: true });
      void qc.invalidateQueries({
        queryKey: queryKeys.reference.customers(activeSalonId ?? undefined),
      });
    }
    setOpenCreate(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [activeSalonId, createForm, location.pathname, location.state, navigate, qc]);

  const createCustomerForAppointment = () => {
    sessionStorage.setItem(
      "ihair-appointment-draft",
      JSON.stringify(createForm.getValues()),
    );
    navigate("/customers", {
      state: {
        createForAppointment: true,
        salonId: effectiveSalonForLists || undefined,
      },
    });
  };

  const createMutation = useMutation({
    mutationFn: async ({
      values,
      overrideOutsideWorkingHours,
      overrideReason,
    }: {
      values: CreateForm;
      overrideOutsideWorkingHours?: boolean;
      overrideReason?: string;
    }) => {
      if (!(values.salonId || activeSalonId)) {
        throw new Error("İşlem için salon seçin");
      }
      const body: AppointmentRequest = {
        customerId: values.customerId,
        employeeId: values.employeeId,
        hairServiceId: values.hairServiceId,
        appointmentDateTime: toLocalDateTimeString(values.appointmentDateTime),
        campaignCode: values.campaignCode?.trim() || null,
        overrideOutsideWorkingHours,
        overrideReason,
      };
      return createAppointment(body);
    },
    onSuccess: async () => {
      toast.success("Randevu oluşturuldu");
      sessionStorage.removeItem("ihair-appointment-draft");
      setOpenCreate(false);
      createForm.reset({
        salonId: salonIdForForm,
        customerId: 0,
        employeeId: 0,
        hairServiceId: 0,
        appointmentDateTime: "",
        campaignCode: "",
      });
      await Promise.all([
        qc.invalidateQueries({
          queryKey: queryKeys.appointments.lists(activeSalonId ?? undefined),
        }),
        qc.invalidateQueries({ queryKey: queryKeys.appointments.weeks }),
      ]);
    },
    onError: (e, variables) => {
      if (
        requiresOutsideHoursConfirmation(e) &&
        !variables.overrideOutsideWorkingHours
      ) {
        setOutsideHoursValues(variables.values);
        return;
      }
      if (axios.isAxiosError(e) && e.response?.status === 409) {
        toast.error(
          getApiErrorMessage(
            e,
            "Bu çalışan için seçilen saatte zaten randevu var.",
          ),
        );
        return;
      }
      toast.error(getApiErrorMessage(e));
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (payload: { id: number; status: AppointmentStatus }) => {
      return updateAppointmentStatus(payload.id, { status: payload.status });
    },
    onSuccess: async (appointment, payload) => {
      toast.success("Randevu güncellendi");
      setOpenStatus(false);
      setEditing(null);
      await Promise.all([
        qc.invalidateQueries({
          queryKey: queryKeys.appointments.lists(activeSalonId ?? undefined),
        }),
        qc.invalidateQueries({ queryKey: queryKeys.appointments.weeks }),
        qc.invalidateQueries({
          queryKey: queryKeys.sales.availableAppointments(appointment.salonId),
        }),
      ]);
      if (payload.status === "ARRIVED") {
        navigate(`/sales/new?appointmentId=${payload.id}`);
      }
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => deleteAppointment(id),
    onSuccess: async () => {
      toast.success("Randevu iptal edildi");
      setDeleting(null);
      await Promise.all([
        qc.invalidateQueries({
          queryKey: queryKeys.appointments.lists(activeSalonId ?? undefined),
        }),
        qc.invalidateQueries({ queryKey: queryKeys.appointments.weeks }),
      ]);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const rows = appointmentsQuery.data?.content ?? [];

  const employeesOptions = employeesScopedQuery.data ?? [];
  const servicesOptions = servicesScopedQuery.data ?? [];
  const customerOptions = customersQuery.data ?? [];

  if (authorizedSalons.length === 0) {
    return (
      <EmptyState
        title="Yetkili salon bulunamadı"
        description="Randevuları görüntülemek için hesabınıza bir salon atanmalıdır."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Randevular</h1>
          <p className="text-muted-foreground text-sm">
            Aynı çalışanın çakışan randevuları otomatik olarak engellenir.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            disabled={activeSalonId == null}
            onClick={() => {
              setOpenCreate(true);
            }}
          >
            <Plus />
            Yeni randevu
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle>
            {appointmentView === "active" ? "Aktif randevular" : "Randevu geçmişi"}
          </CardTitle>
          <Tabs
            value={appointmentView}
            onValueChange={(value) => {
              setAppointmentView(value as "active" | "history");
              setPage(0);
            }}
          >
            <TabsList className="h-auto">
              <TabsTrigger value="active">
                Bekleyen, onaylanan ve gelenler
              </TabsTrigger>
              <TabsTrigger value="history">
                Tamamlanan ve iptaller
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            isLoading={appointmentsQuery.isLoading}
            getRowId={(r) => r.id}
            empty={
              <EmptyState
                title="Randevu yok"
                description={
                  appointmentView === "active"
                    ? "Yeni randevu oluşturarak başlayın."
                    : "Henüz tamamlanmış veya iptal edilmiş randevu yok."
                }
                action={
                  appointmentView === "active" ? (
                    <Button onClick={() => setOpenCreate(true)}>
                      <Plus />
                      Yeni randevu
                    </Button>
                  ) : undefined
                }
              />
            }
            columns={[
              {
                id: "when",
                header: "Tarih",
                priority: "primary",
                cell: (r) => formatDateTime(r.appointmentDateTime),
              },
              {
                id: "customer",
                header: "Müşteri",
                priority: "primary",
                cell: (r) => r.customerName || "—",
              },
              {
                id: "employee",
                header: "Çalışan",
                priority: "secondary",
                cell: (r) => r.employeeName || "—",
              },
              {
                id: "service",
                header: "Hizmet",
                priority: "secondary",
                cell: (r) => r.hairServiceName || "—",
              },
              {
                id: "campaign",
                header: "Kampanya",
                priority: "detail",
                cell: (r) => r.campaignCode || "—",
              },
              {
                id: "originalPrice",
                header: "Liste fiyatı",
                priority: "detail",
                cell: (r) => formatMoney(r.hairServicePrice),
              },
              {
                id: "discount",
                header: "İndirim",
                priority: "detail",
                cell: (r) =>
                  `-${formatMoney(
                    Math.max(0, Number(r.hairServicePrice) - Number(r.finalPrice)),
                  )}`,
              },
              {
                id: "finalPrice",
                header: "Son fiyat",
                priority: "secondary",
                cell: (r) => formatMoney(r.finalPrice),
              },
              {
                id: "status",
                header: "Durum",
                priority: "primary",
                cell: (r) => (
                  <Badge variant="secondary">
                    {APPOINTMENT_STATUS_LABELS[r.status]}
                  </Badge>
                ),
              },
              {
                id: "actions",
                header: "",
                priority: "action",
                mobileLabel: false,
                className: "w-[1%] whitespace-nowrap text-right",
                cell: (r) =>
                  appointmentView === "active" ? (
                    <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(r);
                        statusForm.reset({ status: r.status });
                        setOpenStatus(true);
                      }}
                    >
                      <Pencil />
                      Durum
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleting(r)}
                    >
                      <Trash2 />
                      İptal
                    </Button>
                    </div>
                  ) : null,
              },
            ]}
          />
          <PaginationControls
            page={appointmentsQuery.data?.page ?? page}
            totalPages={appointmentsQuery.data?.totalPages ?? 0}
            totalElements={appointmentsQuery.data?.totalElements ?? 0}
            isFetching={appointmentsQuery.isFetching}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni randevu</DialogTitle>
            <DialogDescription>
              Kampanya kodu isteğe bağlıdır. Geçerli kod girildiğinde tahmini tutar
              hesaplanır.
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4"
            onSubmit={createForm.handleSubmit((v) =>
              createMutation.mutate({ values: v }),
            )}
          >
            {isAdmin ? (
              <div className="grid gap-2">
                <Label>Salon</Label>
                <Select
                  value={
                    createForm.watch("salonId")
                      ? String(createForm.watch("salonId"))
                      : ""
                  }
                  onValueChange={(v) => {
                    const sid = Number(v);
                    createForm.setValue("salonId", sid, { shouldValidate: true });
                    createForm.setValue("customerId", 0, { shouldValidate: true });
                    createForm.setValue("employeeId", 0, { shouldValidate: true });
                    createForm.setValue("hairServiceId", 0, { shouldValidate: true });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Salon seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {authorizedSalons.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Müşteri</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={createCustomerForAppointment}
                >
                  <UserPlus />
                  Yeni müşteri oluştur
                </Button>
              </div>
              <Select
                value={
                  createForm.watch("customerId")
                    ? String(createForm.watch("customerId"))
                    : ""
                }
                onValueChange={(v) =>
                  createForm.setValue("customerId", Number(v), { shouldValidate: true })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Müşteri seçin" />
                </SelectTrigger>
                <SelectContent>
                  {customerOptions.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.firstName} {c.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createForm.formState.errors.customerId?.message ? (
                <p className="text-destructive text-sm">
                  {createForm.formState.errors.customerId.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Çalışan</Label>
              <Select
                value={
                  createForm.watch("employeeId")
                    ? String(createForm.watch("employeeId"))
                    : ""
                }
                onValueChange={(v) =>
                  createForm.setValue("employeeId", Number(v), { shouldValidate: true })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Çalışan seçin" />
                </SelectTrigger>
                <SelectContent>
                  {employeesOptions.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.firstName} {e.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createForm.formState.errors.employeeId?.message ? (
                <p className="text-destructive text-sm">
                  {createForm.formState.errors.employeeId.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Hizmet</Label>
              <Select
                value={
                  createForm.watch("hairServiceId")
                    ? String(createForm.watch("hairServiceId"))
                    : ""
                }
                onValueChange={(v) =>
                  createForm.setValue("hairServiceId", Number(v), {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Hizmet seçin" />
                </SelectTrigger>
                <SelectContent>
                  {servicesOptions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} — {formatMoney(s.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createForm.formState.errors.hairServiceId?.message ? (
                <p className="text-destructive text-sm">
                  {createForm.formState.errors.hairServiceId.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="appointmentDateTime">Tarih / saat</Label>
              <Input
                id="appointmentDateTime"
                type="datetime-local"
                {...createForm.register("appointmentDateTime")}
              />
              {createForm.formState.errors.appointmentDateTime?.message ? (
                <p className="text-destructive text-sm">
                  {createForm.formState.errors.appointmentDateTime.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="campaignCode">Kampanya kodu (isteğe bağlı)</Label>
              <Input id="campaignCode" {...createForm.register("campaignCode")} />
              <div className="text-muted-foreground text-xs">
                Liste fiyatı: <span className="font-medium">{formatMoney(basePrice)}</span>
                {" · "}
                Tahmini tutar:{" "}
                <span className="font-medium">{formatMoney(previewPrice)}</span>
                {previewCampaign ? (
                  <span>
                    {" "}
                    ({DISCOUNT_TYPE_LABELS[previewCampaign.discountType]} /{" "}
                    {String(previewCampaign.discountValue)})
                  </span>
                ) : null}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                Vazgeç
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Oluşturuluyor…" : "Oluştur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openStatus} onOpenChange={setOpenStatus}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Randevu durumu</DialogTitle>
            <DialogDescription>Randevu #{editing?.id}</DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4"
            onSubmit={statusForm.handleSubmit((v) => {
              if (!editing) return;
              statusMutation.mutate({ id: editing.id, status: v.status });
            })}
          >
            <div className="grid gap-2">
              <Label>Durum</Label>
              <Select
                value={statusForm.watch("status")}
                onValueChange={(val) =>
                  statusForm.setValue("status", val as AppointmentStatus, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenStatus(false)}>
                Vazgeç
              </Button>
              <Button type="submit" disabled={statusMutation.isPending}>
                {statusMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={outsideHoursValues != null}
        onOpenChange={(o) => !o && setOutsideHoursValues(null)}
        title="Çalışma saatleri dışında randevu"
        description="Seçtiğiniz tarih ve saat salonun çalışma saatleri dışında veya kapalı bir güne denk geliyor. Bu randevuyu çalışma saatleri dışında oluşturmak istediğinizden emin misiniz?"
        confirmText="Yine de oluştur"
        isLoading={createMutation.isPending}
        onConfirm={async () => {
          if (!outsideHoursValues) return;
          await createMutation.mutateAsync({
            values: outsideHoursValues,
            overrideOutsideWorkingHours: true,
            overrideReason: "Kullanıcı çalışma saatleri dışı randevuyu onayladı.",
          });
          setOutsideHoursValues(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Randevuyu iptal et?"
        description="Bu işlem randevuyu iptal durumuna alır."
        confirmText="İptal et"
        destructive
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          await deleteMutation.mutateAsync(deleting.id);
        }}
      />
    </div>
  );
}
