import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";

import { getAppointment, updateAppointment } from "@/api/appointments";
import { getApiErrorMessage } from "@/api/client";
import { listCustomers } from "@/api/customers";
import { listEmployees } from "@/api/employees";
import { listHairServices } from "@/api/hairServices";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/labels";
import { cacheTimes, queryKeys } from "@/lib/queryKeys";
import type {
  AppointmentRequest,
  AppointmentStatus,
} from "@/types/domain";

const outsideHoursCode = "OUTSIDE_WORKING_HOURS_CONFIRMATION_REQUIRED";
const outsideHoursDescription =
  "Seçtiğiniz tarih ve saat salonun çalışma saatleri dışında veya kapalı bir güne denk geliyor. Bu randevuyu çalışma saatleri dışında oluşturmak istediğinizden emin misiniz?";

function hasOutsideHoursCode(error: unknown) {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) return false;
  const visit = (value: unknown): boolean => {
    if (value === outsideHoursCode) return true;
    if (!value || typeof value !== "object") return false;
    return Object.values(value as Record<string, unknown>).some(visit);
  };
  return visit(error.response.data);
}

function toInputDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

export function AppointmentDetailDialog({
  appointmentId,
  onOpenChange,
}: {
  appointmentId: number | null;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [pendingOverride, setPendingOverride] =
    useState<AppointmentRequest | null>(null);
  const [form, setForm] = useState<AppointmentRequest>({
    customerId: 0,
    employeeId: 0,
    hairServiceId: 0,
    appointmentDateTime: "",
    campaignCode: null,
    notes: null,
    status: "PENDING",
  });

  const query = useQuery({
    queryKey: queryKeys.appointments.detail(appointmentId ?? 0),
    queryFn: () => getAppointment(appointmentId!),
    enabled: appointmentId != null,
    staleTime: cacheTimes.detail,
  });
  const appointment = query.data;
  const salonId = appointment?.salonId;
  const customersQuery = useQuery({
    queryKey: queryKeys.reference.customers(salonId),
    queryFn: () => listCustomers(salonId),
    enabled: editing && salonId != null,
    staleTime: cacheTimes.reference,
  });
  const employeesQuery = useQuery({
    queryKey: queryKeys.reference.employees(salonId),
    queryFn: () => listEmployees(salonId!),
    enabled: editing && salonId != null,
    staleTime: cacheTimes.reference,
  });
  const servicesQuery = useQuery({
    queryKey: queryKeys.reference.hairServices(salonId),
    queryFn: () => listHairServices(salonId!),
    enabled: editing && salonId != null,
    staleTime: cacheTimes.reference,
  });

  const beginEditing = () => {
    if (!appointment) return;
    setForm({
      customerId: appointment.customerId,
      employeeId: appointment.employeeId,
      hairServiceId: appointment.hairServiceId,
      appointmentDateTime: toInputDateTime(appointment.appointmentDateTime),
      campaignCode: appointment.campaignCode ?? null,
      notes: appointment.notes ?? null,
      status: appointment.status,
      version: appointment.version,
    });
    setEditing(true);
  };

  const mutation = useMutation({
    mutationFn: (body: AppointmentRequest) =>
      updateAppointment(appointmentId!, body),
    onSuccess: async () => {
      toast.success("Randevu güncellendi");
      setPendingOverride(null);
      setEditing(false);
      await Promise.all([
        qc.invalidateQueries({
          queryKey: queryKeys.appointments.detail(appointmentId ?? 0),
        }),
        qc.invalidateQueries({ queryKey: queryKeys.appointments.weeks }),
        qc.invalidateQueries({
          queryKey: queryKeys.appointments.lists(salonId),
        }),
        ...(salonId == null
          ? []
          : [
              qc.invalidateQueries({
                queryKey: queryKeys.sales.availableAppointments(salonId),
              }),
            ]),
      ]);
    },
    onError: (error, variables) => {
      if (hasOutsideHoursCode(error) && !variables.overrideOutsideWorkingHours) {
        setPendingOverride(variables);
        return;
      }
      toast.error(getApiErrorMessage(error));
    },
  });

  const updateField = <K extends keyof AppointmentRequest>(
    key: K,
    value: AppointmentRequest[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <>
      <Dialog
        open={appointmentId != null}
        onOpenChange={(open) => {
          if (!open) setEditing(false);
          onOpenChange(open);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Randevu detayı{appointment ? ` #${appointment.id}` : ""}
            </DialogTitle>
            <DialogDescription>
              Güncel randevu bilgilerini görüntüleyin veya düzenleyin.
            </DialogDescription>
          </DialogHeader>

          {query.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-40" />
            </div>
          ) : query.isError || !appointment ? (
            <p className="text-destructive text-sm">Randevu yüklenemedi.</p>
          ) : editing ? (
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate({
                  ...form,
                  appointmentDateTime:
                    form.appointmentDateTime.length === 16
                      ? `${form.appointmentDateTime}:00`
                      : form.appointmentDateTime,
                  campaignCode: form.campaignCode?.trim() || null,
                  notes: form.notes?.trim() || null,
                });
              }}
            >
              <SelectField
                label="Müşteri"
                value={form.customerId}
                onChange={(value) => updateField("customerId", value)}
                options={(customersQuery.data ?? []).map((item) => ({
                  value: item.id,
                  label: `${item.firstName} ${item.lastName}`,
                }))}
              />
              <SelectField
                label="Çalışan"
                value={form.employeeId}
                onChange={(value) => updateField("employeeId", value)}
                options={(employeesQuery.data ?? []).map((item) => ({
                  value: item.id,
                  label: `${item.firstName} ${item.lastName}`,
                }))}
              />
              <SelectField
                label="Hizmet"
                value={form.hairServiceId}
                onChange={(value) => updateField("hairServiceId", value)}
                options={(servicesQuery.data ?? []).map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
              <div className="grid gap-2">
                <Label htmlFor="editAppointmentDateTime">Tarih / saat</Label>
                <Input
                  id="editAppointmentDateTime"
                  type="datetime-local"
                  required
                  value={form.appointmentDateTime}
                  onChange={(event) =>
                    updateField("appointmentDateTime", event.target.value)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editCampaignCode">Kampanya kodu</Label>
                <Input
                  id="editCampaignCode"
                  value={form.campaignCode ?? ""}
                  onChange={(event) =>
                    updateField("campaignCode", event.target.value)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editNotes">Notlar</Label>
                <Textarea
                  id="editNotes"
                  value={form.notes ?? ""}
                  onChange={(event) => updateField("notes", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Durum</Label>
                <Select
                  value={form.status ?? "PENDING"}
                  onValueChange={(value) =>
                    updateField("status", value as AppointmentStatus)
                  }
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Vazgeç
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Kaydediliyor…" : "Kaydet"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-sm">
                  {formatDateTime(appointment.appointmentDateTime)}
                </span>
                <Badge variant="secondary">
                  {APPOINTMENT_STATUS_LABELS[appointment.status]}
                </Badge>
              </div>
              <dl className="grid gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2">
                <Detail label="Müşteri" value={appointment.customerName} />
                <Detail label="Çalışan" value={appointment.employeeName} />
                <Detail label="Hizmet" value={appointment.hairServiceName} />
                <Detail
                  label="Süre"
                  value={
                    appointment.durationMinutes
                      ? `${appointment.durationMinutes} dakika`
                      : "—"
                  }
                />
                <Detail label="Kampanya" value={appointment.campaignCode || "—"} />
                <Detail
                  label="Mesai dışı onay"
                  value={appointment.scheduleOverridden ? "Onaylandı" : "Hayır"}
                />
              </dl>
              {appointment.notes ? (
                <div className="rounded-xl border p-4 text-sm">
                  <p className="text-muted-foreground mb-1">Notlar</p>
                  <p className="whitespace-pre-wrap">{appointment.notes}</p>
                </div>
              ) : null}
              <DialogFooter>
                <Button onClick={beginEditing}>Düzenle</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={pendingOverride != null}
        onOpenChange={(open) => !open && setPendingOverride(null)}
        title="Çalışma saatleri dışında randevu"
        description={outsideHoursDescription}
        confirmText="Yine de kaydet"
        isLoading={mutation.isPending}
        onConfirm={async () => {
          if (!pendingOverride) return;
          await mutation.mutateAsync({
            ...pendingOverride,
            overrideOutsideWorkingHours: true,
            overrideReason: "Kullanıcı çalışma saatleri dışı randevuyu onayladı.",
          });
        }}
      />
    </>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: { value: number; label: string }[];
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select value={value ? String(value) : ""} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="w-full"><SelectValue placeholder={`${label} seçin`} /></SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
