import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  createCampaign,
  deleteCampaign,
  listCampaigns,
  updateCampaign,
} from "@/api/campaigns";
import { listCustomers } from "@/api/customers";
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
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { DISCOUNT_TYPE_LABELS } from "@/lib/labels";
import type { Campaign, CampaignRequest, DiscountType } from "@/types/domain";
import { useAuthStore } from "@/stores/authStore";

const schema = z
  .object({
    salonId: z.coerce.number().optional(),
    name: z.string().min(1, "İsim gerekli"),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SESSION"]),
    discountValue: z.coerce.number().optional(),
    code: z.string().optional(),
    maxUsageCount: z.coerce.number().optional(),
    isCustomerSpecific: z.boolean().optional(),
    customerId: z.coerce.number().optional(),
    validFrom: z.string().optional(),
    validTo: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.discountType === "FREE_SESSION") return;
    const dv = val.discountValue;
    if (dv === undefined || Number.isNaN(dv)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "İndirim değeri gerekli",
        path: ["discountValue"],
      });
      return;
    }
    if (val.discountType === "PERCENTAGE" && (dv < 0 || dv > 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Yüzde 0-100 arasında olmalı",
        path: ["discountValue"],
      });
    }
    if (val.discountType === "FIXED_AMOUNT" && dv < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tutar 0 veya üzeri olmalı",
        path: ["discountValue"],
      });
    }
  });

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function toRequest(values: FormValues, salonId: number): CampaignRequest {
  const discountValue =
    values.discountType === "FREE_SESSION" ? 0 : Number(values.discountValue ?? 0);
  return {
    salonId: values.salonId ?? salonId,
    name: values.name,
    discountType: values.discountType as DiscountType,
    discountValue,
    code: values.code?.trim() ? values.code.trim() : null,
    maxUsageCount: values.maxUsageCount ?? null,
    isCustomerSpecific: Boolean(values.isCustomerSpecific),
    customerId: values.isCustomerSpecific ? values.customerId ?? null : null,
    validFrom: values.validFrom?.trim() ? toLocalDateTimeString(values.validFrom) : null,
    validTo: values.validTo?.trim() ? toLocalDateTimeString(values.validTo) : null,
  };
}

function toLocalDateTimeString(dtLocal: string) {
  if (!dtLocal.includes("T")) return dtLocal;
  const [d, t] = dtLocal.split("T");
  const time = t.length === 5 ? `${t}:00` : t;
  return `${d}T${time}`;
}

export function CampaignsPage() {
  const qc = useQueryClient();
  const isAdmin = useAuthStore((state) => state.role === "ADMIN");
  const activeSalonId = useAuthStore((state) => state.activeSalonId);
  const authorizedSalons = useAuthStore((state) => state.authorizedSalons);
  const customersQuery = useQuery({
    queryKey: ["customers", activeSalonId],
    queryFn: () => listCustomers(activeSalonId ?? undefined),
    enabled: activeSalonId != null,
  });

  const campaignsQuery = useQuery({
    queryKey: ["campaigns", activeSalonId],
    queryFn: () => listCampaigns(activeSalonId ?? undefined),
    enabled: isAdmin || activeSalonId != null,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState<Campaign | null>(null);

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      salonId: undefined,
      discountType: "PERCENTAGE",
      discountValue: 10,
      code: "",
      maxUsageCount: undefined,
      isCustomerSpecific: false,
      customerId: undefined,
      validFrom: "",
      validTo: "",
    },
  });

  const discountType = form.watch("discountType");
  const isCustomerSpecific = Boolean(form.watch("isCustomerSpecific"));
  const selectedSalonId = Number(form.watch("salonId")) || 0;

  const resetFor = (c?: Campaign | null) => {
    if (!c) {
      form.reset({
        salonId: activeSalonId ?? undefined,
        name: "",
        discountType: "PERCENTAGE",
        discountValue: 10,
        code: "",
        maxUsageCount: undefined,
        isCustomerSpecific: false,
        customerId: undefined,
        validFrom: "",
        validTo: "",
      });
      return;
    }
    form.reset({
      salonId: c.salonId,
      name: c.name,
      discountType: c.discountType as DiscountType,
      discountValue: Number(c.discountValue),
      code: c.code ?? "",
      maxUsageCount: c.maxUsageCount ?? undefined,
      isCustomerSpecific: Boolean(c.isCustomerSpecific),
      customerId: c.customerId ?? undefined,
      validFrom: c.validFrom ? c.validFrom.slice(0, 16) : "",
      validTo: c.validTo ? c.validTo.slice(0, 16) : "",
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const targetSalonId = values.salonId ?? activeSalonId;
      if (!targetSalonId) throw new Error("İşlem için salon seçin");
      const body = toRequest(values, targetSalonId);
      if (editing) return updateCampaign(editing.id, body);
      return createCampaign(body);
    },
    onSuccess: async (data) => {
      toast.success(editing ? "Kampanya güncellendi" : "Kampanya oluşturuldu");
      if (!editing && data?.code) {
        toast.message(`Oluşturulan kod: ${data.code}`);
      }
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => deleteCampaign(id),
    onSuccess: async () => {
      toast.success("Kampanya pasifleştirildi");
      setDeleting(null);
      await qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const rows = useMemo(() => campaignsQuery.data ?? [], [campaignsQuery.data]);
  const customerOptions = useMemo(() => {
    const customers = customersQuery.data ?? [];
    return isAdmin
      ? customers.filter((customer) => customer.salonId === selectedSalonId)
      : customers;
  }, [customersQuery.data, isAdmin, selectedSalonId]);

  if (authorizedSalons.length === 0) {
    return (
      <EmptyState
        title="Yetkili salon bulunamadı"
        description="Kampanyaları yönetmek için hesabınıza bir salon atanmalıdır."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kampanyalar</h1>
          <p className="text-muted-foreground text-sm">
            Kod boş bırakılırsa sunucu <code>IH-XXXXXXXX</code> formatında üretir.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Button
          disabled={activeSalonId == null}
          onClick={() => {
            setEditing(null);
            resetFor(null);
            setOpen(true);
          }}
        >
          <Plus />
          Yeni kampanya
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
            isLoading={campaignsQuery.isLoading}
            getRowId={(r) => r.id}
            empty={
              <EmptyState
                title="Kampanya yok"
                description="İndirim kampanyalarını buradan yönetin."
                action={
                  <Button
                    onClick={() => {
                      setEditing(null);
                      resetFor(null);
                      setOpen(true);
                    }}
                  >
                    <Plus />
                    Yeni kampanya
                  </Button>
                }
              />
            }
            columns={[
              { id: "name", header: "Ad", cell: (r) => r.name },
              { id: "code", header: "Kod", cell: (r) => <span className="font-mono">{r.code}</span> },
              {
                id: "type",
                header: "Tip",
                cell: (r) => (
                  <Badge variant="secondary">
                    {DISCOUNT_TYPE_LABELS[r.discountType]}
                  </Badge>
                ),
              },
              {
                id: "value",
                header: "Değer",
                cell: (r) =>
                  r.discountType === "FREE_SESSION"
                    ? "—"
                    : String(r.discountValue),
              },
              {
                id: "usage",
                header: "Kullanım",
                cell: (r) =>
                  `${r.usedCount ?? 0}/${r.maxUsageCount ?? "∞"}`,
              },
              {
                id: "active",
                header: "Durum",
                cell: (r) => (
                  <Badge variant={r.active ? "secondary" : "outline"}>
                    {r.active ? "Aktif" : "Pasif"}
                  </Badge>
                ),
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
                        resetFor(r);
                        setOpen(true);
                      }}
                    >
                      <Pencil />
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleting(r)}
                    >
                      <Trash2 />
                      Pasifleştir
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Kampanya düzenle" : "Yeni kampanya"}</DialogTitle>
            <DialogDescription>
              Müşteriye özel kampanyalarda aşağıdan müşteri seçin.
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
          >
            {isAdmin ? (
              <div className="grid gap-2">
                <Label>Salon</Label>
                <Select
                  value={selectedSalonId ? String(selectedSalonId) : ""}
                  onValueChange={(value) => {
                    form.setValue("salonId", Number(value), { shouldValidate: true });
                    form.setValue("customerId", undefined);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Salon seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {authorizedSalons.map((salon) => (
                      <SelectItem key={salon.id} value={String(salon.id)}>
                        {salon.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="name">Ad</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name?.message ? (
                <p className="text-destructive text-sm">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>İndirim tipi</Label>
              <Select
                value={discountType}
                onValueChange={(v) =>
                  form.setValue("discountType", v as DiscountType, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DISCOUNT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="discountValue">
                İndirim değeri
                {discountType === "PERCENTAGE"
                  ? " (%)"
                  : discountType === "FIXED_AMOUNT"
                    ? " (₺)"
                    : ""}
              </Label>
              <Input
                id="discountValue"
                type="number"
                step="0.01"
                disabled={discountType === "FREE_SESSION"}
                {...form.register("discountValue", { valueAsNumber: true })}
              />
              {form.formState.errors.discountValue?.message ? (
                <p className="text-destructive text-sm">
                  {form.formState.errors.discountValue.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="code">Kod (isteğe bağlı)</Label>
              <Input id="code" placeholder="Boş bırakırsanız otomatik üretilir" {...form.register("code")} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="maxUsageCount">Azami kullanım (isteğe bağlı)</Label>
              <Input
                id="maxUsageCount"
                type="number"
                {...form.register("maxUsageCount", { valueAsNumber: true })}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <Label>Müşteriye özel</Label>
                <div className="text-muted-foreground text-xs">
                  Açıksa aşağıdan müşteri seçin.
                </div>
              </div>
              <Switch
                checked={isCustomerSpecific}
                onCheckedChange={(v) => form.setValue("isCustomerSpecific", v)}
              />
            </div>

            {isCustomerSpecific ? (
              <div className="grid gap-2">
                <Label>Müşteri</Label>
                <Select
                  value={form.watch("customerId") ? String(form.watch("customerId")) : ""}
                  onValueChange={(v) =>
                    form.setValue("customerId", Number(v), { shouldValidate: true })
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
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="validFrom">Geçerlilik başlangıç</Label>
                <Input id="validFrom" type="datetime-local" {...form.register("validFrom")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="validTo">Geçerlilik bitiş</Label>
                <Input id="validTo" type="datetime-local" {...form.register("validTo")} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Vazgeç
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Kampanyayı pasifleştir?"
        description="Bu işlem kampanyayı pasif duruma alır."
        confirmText="Pasifleştir"
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
