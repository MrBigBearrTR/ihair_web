import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  createAppointment,
  deleteAppointment,
  listAppointments,
  updateAppointment,
} from "@/api/appointments";
import { validateCampaign } from "@/api/campaigns";
import { listCustomers } from "@/api/customers";
import { listEmployees } from "@/api/employees";
import { listHairServices } from "@/api/hairServices";
import { listSalons } from "@/api/salons";
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
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDateTime, formatMoney } from "@/lib/format";
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
  salonId: z.coerce.number().min(1, "Salon seçin"),
  customerId: z.coerce.number().min(1, "Müşteri seçin"),
  employeeId: z.coerce.number().min(1, "Çalışan seçin"),
  hairServiceId: z.coerce.number().min(1, "Hizmet seçin"),
  appointmentDateTime: z.string().min(1, "Tarih/saat seçin"),
  campaignCode: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

const statusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
});

type StatusForm = z.infer<typeof statusSchema>;

export function AppointmentsPage() {
  const qc = useQueryClient();
  const [salonFilter, setSalonFilter] = useState<string>("all");

  const [openCreate, setOpenCreate] = useState(false);
  const [openStatus, setOpenStatus] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState<Appointment | null>(null);

  const salonsQuery = useQuery({ queryKey: ["salons"], queryFn: listSalons });
  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: listCustomers,
  });
  const appointmentsQuery = useQuery({
    queryKey: ["appointments"],
    queryFn: listAppointments,
  });

  const salonIdForForm = useMemo(() => {
    if (salonFilter !== "all") return Number(salonFilter);
    return salonsQuery.data?.[0]?.id ?? 0;
  }, [salonFilter, salonsQuery.data]);

  const createForm = useForm<CreateForm>({
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

  const watchedSalonId = createForm.watch("salonId");
  const watchedServiceId = createForm.watch("hairServiceId");
  const watchedCampaignCode = createForm.watch("campaignCode");
  const debouncedCampaign = useDebounce(watchedCampaignCode ?? "", 400);

  const effectiveSalonForLists = watchedSalonId || salonIdForForm;

  const employeesScopedQuery = useQuery({
    queryKey: ["employees", effectiveSalonForLists],
    queryFn: () => listEmployees(effectiveSalonForLists),
    enabled: openCreate && effectiveSalonForLists > 0,
  });
  const servicesScopedQuery = useQuery({
    queryKey: ["hair-services", effectiveSalonForLists],
    queryFn: () => listHairServices(effectiveSalonForLists),
    enabled: openCreate && effectiveSalonForLists > 0,
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
    const sid = salonFilter !== "all" ? Number(salonFilter) : salonsQuery.data?.[0]?.id;
    if (sid) {
      createForm.setValue("salonId", sid, { shouldValidate: true });
    }
  }, [openCreate, salonFilter, salonsQuery.data, createForm]);

  const createMutation = useMutation({
    mutationFn: async (values: CreateForm) => {
      const body: AppointmentRequest = {
        customerId: values.customerId,
        employeeId: values.employeeId,
        hairServiceId: values.hairServiceId,
        appointmentDateTime: toLocalDateTimeString(values.appointmentDateTime),
        campaignCode: values.campaignCode?.trim() || null,
      };
      return createAppointment(body);
    },
    onSuccess: async () => {
      toast.success("Randevu oluşturuldu");
      setOpenCreate(false);
      createForm.reset({
        salonId: salonIdForForm,
        customerId: 0,
        employeeId: 0,
        hairServiceId: 0,
        appointmentDateTime: "",
        campaignCode: "",
      });
      await qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e) => {
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
      return updateAppointment(payload.id, { status: payload.status });
    },
    onSuccess: async () => {
      toast.success("Randevu güncellendi");
      setOpenStatus(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => deleteAppointment(id),
    onSuccess: async () => {
      toast.success("Randevu iptal edildi");
      setDeleting(null);
      await qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const rows = useMemo(() => {
    const all = appointmentsQuery.data ?? [];
    if (salonFilter === "all") return all;
    const sid = Number(salonFilter);
    return all.filter((a) => {
      const e = a.employee;
      return e?.salonId === sid;
    });
  }, [appointmentsQuery.data, salonFilter]);

  const employeesOptions = employeesScopedQuery.data ?? [];
  const servicesOptions = servicesScopedQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Randevular</h1>
          <p className="text-muted-foreground text-sm">
            Randevu oluştururken çakışmalar otomatik engellenir (409).
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="grid gap-1">
            <Label>Liste filtresi (salon)</Label>
            <Select value={salonFilter} onValueChange={setSalonFilter}>
              <SelectTrigger className="w-full sm:w-[240px]">
                <SelectValue placeholder="Salon seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                {(salonsQuery.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="sm:mt-6"
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
        <CardHeader>
          <CardTitle>Liste</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            isLoading={appointmentsQuery.isLoading}
            getRowId={(r) => r.id}
            empty={
              <EmptyState
                title="Randevu yok"
                description="Yeni randevu oluşturarak başlayın."
                action={
                  <Button onClick={() => setOpenCreate(true)}>
                    <Plus />
                    Yeni randevu
                  </Button>
                }
              />
            }
            columns={[
              {
                id: "when",
                header: "Tarih",
                cell: (r) => formatDateTime(r.appointmentDateTime),
              },
              {
                id: "customer",
                header: "Müşteri",
                cell: (r) =>
                  r.customer
                    ? `${r.customer.firstName} ${r.customer.lastName}`
                    : `#${r.customerId}`,
              },
              {
                id: "employee",
                header: "Çalışan",
                cell: (r) =>
                  r.employee
                    ? `${r.employee.firstName} ${r.employee.lastName}`
                    : `#${r.employeeId}`,
              },
              {
                id: "service",
                header: "Hizmet",
                cell: (r) => r.hairService?.name ?? `#${r.hairServiceId}`,
              },
              {
                id: "price",
                header: "Tutar",
                cell: (r) => formatMoney(r.finalPrice ?? undefined),
              },
              {
                id: "status",
                header: "Durum",
                cell: (r) => <Badge variant="secondary">{r.status}</Badge>,
              },
              {
                id: "actions",
                header: "",
                className: "w-[1%] whitespace-nowrap text-right",
                cell: (r) => (
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
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni randevu</DialogTitle>
            <DialogDescription>
              Kampanya kodu opsiyoneldir. Geçerli kod girildiğinde tahmini tutar
              hesaplanır.
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4"
            onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}
          >
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
                  createForm.setValue("employeeId", 0, { shouldValidate: true });
                  createForm.setValue("hairServiceId", 0, { shouldValidate: true });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Salon seçin" />
                </SelectTrigger>
                <SelectContent>
                  {(salonsQuery.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createForm.formState.errors.salonId?.message ? (
                <p className="text-destructive text-sm">
                  {createForm.formState.errors.salonId.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Müşteri</Label>
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
                  {(customersQuery.data ?? []).map((c) => (
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
              <Label htmlFor="campaignCode">Kampanya kodu (opsiyonel)</Label>
              <Input id="campaignCode" {...createForm.register("campaignCode")} />
              <div className="text-muted-foreground text-xs">
                Liste fiyatı: <span className="font-medium">{formatMoney(basePrice)}</span>
                {" · "}
                Tahmini tutar:{" "}
                <span className="font-medium">{formatMoney(previewPrice)}</span>
                {previewCampaign ? (
                  <span>
                    {" "}
                    ({previewCampaign.discountType} / {String(previewCampaign.discountValue)})
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
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="CONFIRMED">CONFIRMED</SelectItem>
                  <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                  <SelectItem value="CANCELLED">CANCELLED</SelectItem>
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
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Randevuyu iptal et?"
        description="Bu işlem randevuyu iptal statüsüne alır (soft delete)."
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
