import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { getApiErrorMessage } from "@/api/client";
import {
  createHairService,
  deleteHairService,
  listHairServices,
  updateHairService,
} from "@/api/hairServices";
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
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import type { HairService, HairServiceRequest } from "@/types/domain";
import { useAuthStore } from "@/stores/authStore";

const schema = z.object({
  salonId: z.coerce.number().optional(),
  name: z.string().min(1, "İsim gerekli"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Fiyat 0 veya üzeri olmalı"),
  durationMinutes: z.preprocess((v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }, z.number().positive().optional()),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function toRequest(values: FormValues, salonId: number): HairServiceRequest {
  const dm =
    typeof values.durationMinutes === "number" &&
    Number.isFinite(values.durationMinutes) &&
    values.durationMinutes > 0
      ? values.durationMinutes
      : null;
  return {
    salonId: values.salonId ?? salonId,
    name: values.name,
    description: values.description || null,
    price: values.price,
    durationMinutes: dm,
  };
}

export function HairServicesPage() {
  const qc = useQueryClient();
  const isAdmin = useAuthStore((state) => state.role === "ADMIN");
  const activeSalonId = useAuthStore((state) => state.activeSalonId);
  const authorizedSalons = useAuthStore((state) => state.authorizedSalons);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HairService | null>(null);
  const [deleting, setDeleting] = useState<HairService | null>(null);

  const servicesQuery = useQuery({
    queryKey: ["hair-services", activeSalonId],
    queryFn: () => listHairServices(activeSalonId ?? undefined),
    enabled: isAdmin || activeSalonId != null,
  });

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      salonId: 0,
      name: "",
      description: "",
      price: 0,
      durationMinutes: undefined,
    },
  });

  const resetFor = (svc?: HairService | null) => {
    if (!svc) {
      form.reset({
        salonId: activeSalonId ?? undefined,
        name: "",
        description: "",
        price: 0,
        durationMinutes: undefined,
      });
      return;
    }
    form.reset({
      salonId: svc.salonId,
      name: svc.name,
      description: svc.description ?? "",
      price: Number(svc.price),
      durationMinutes: svc.durationMinutes ?? undefined,
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const targetSalonId = values.salonId ?? activeSalonId;
      if (!targetSalonId) throw new Error("İşlem için salon seçin");
      const body = toRequest(values, targetSalonId);
      if (editing) return updateHairService(editing.id, body);
      return createHairService(body);
    },
    onSuccess: async () => {
      toast.success(editing ? "Hizmet güncellendi" : "Hizmet oluşturuldu");
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["hair-services"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => deleteHairService(id),
    onSuccess: async () => {
      toast.success("Hizmet pasifleştirildi");
      setDeleting(null);
      await qc.invalidateQueries({ queryKey: ["hair-services"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const rows = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data]);

  if (authorizedSalons.length === 0) {
    return (
      <EmptyState
        title="Yetkili salon bulunamadı"
        description="Hizmetleri yönetmek için hesabınıza bir salon atanmalıdır."
      />
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hizmetler</h1>
          <p className="text-muted-foreground text-sm">
            Salon bazlı hizmet ve fiyat tanımları.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            disabled={activeSalonId == null}
            onClick={() => {
              setEditing(null);
              resetFor(null);
              setOpen(true);
            }}
          >
            <Plus />
            Yeni hizmet
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
            isLoading={servicesQuery.isLoading}
            getRowId={(r) => r.id}
            empty={
              <EmptyState
                title="Hizmet bulunamadı"
                description="Filtreyi değiştirin veya yeni hizmet ekleyin."
                action={
                  <Button
                    onClick={() => {
                      setEditing(null);
                      resetFor(null);
                      setOpen(true);
                    }}
                  >
                    <Plus />
                    Yeni hizmet
                  </Button>
                }
              />
            }
            columns={[
              { id: "name", header: "Hizmet", cell: (r) => r.name },
              {
                id: "salon",
                header: "Salon",
                cell: (r) => {
                  const s = authorizedSalons.find((x) => x.id === r.salonId);
                  return s?.name ?? `Salon #${r.salonId}`;
                },
              },
              {
                id: "price",
                header: "Fiyat",
                cell: (r) => formatMoney(r.price),
              },
              {
                id: "duration",
                header: "Süre (dk)",
                cell: (r) => r.durationMinutes ?? "—",
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Hizmet düzenle" : "Yeni hizmet"}</DialogTitle>
            <DialogDescription>Fiyat ve süre bilgilerini girin.</DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
          >
            {isAdmin ? <div className="grid gap-2">
              <Label>Salon</Label>
              <Select
                value={form.watch("salonId") ? String(form.watch("salonId")) : ""}
                onValueChange={(v) =>
                  form.setValue("salonId", Number(v), { shouldValidate: true })
                }
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
              {form.formState.errors.salonId?.message ? (
                <p className="text-destructive text-sm">
                  {form.formState.errors.salonId.message}
                </p>
              ) : null}
            </div> : null}

            <div className="grid gap-2">
              <Label htmlFor="name">Hizmet adı</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name?.message ? (
                <p className="text-destructive text-sm">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea id="description" rows={3} {...form.register("description")} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Fiyat (₺)</Label>
                <Input id="price" type="number" step="0.01" {...form.register("price")} />
                {form.formState.errors.price?.message ? (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.price.message}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="durationMinutes">Süre (dk)</Label>
                <Input id="durationMinutes" type="number" {...form.register("durationMinutes")} />
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
        title="Hizmeti pasifleştir?"
        description="Bu işlem hizmeti pasif duruma alır."
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
