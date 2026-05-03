import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import {
  createSalon,
  deleteSalon,
  listSalons,
  updateSalon,
} from "@/api/salons";
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
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import type { Salon, SalonRequest } from "@/types/domain";

const schema = z.object({
  name: z.string().min(1, "İsim gerekli"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toRequest(values: FormValues): SalonRequest {
  return {
    name: values.name,
    address: values.address || null,
    phone: values.phone || null,
    email: values.email || null,
  };
}

export function SalonsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Salon | null>(null);
  const [deleting, setDeleting] = useState<Salon | null>(null);

  const salonsQuery = useQuery({
    queryKey: ["salons"],
    queryFn: listSalons,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", address: "", phone: "", email: "" },
  });

  const resetFor = (salon?: Salon | null) => {
    if (!salon) {
      form.reset({ name: "", address: "", phone: "", email: "" });
      return;
    }
    form.reset({
      name: salon.name,
      address: salon.address ?? "",
      phone: salon.phone ?? "",
      email: salon.email ?? "",
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const body = toRequest(values);
      if (editing) return updateSalon(editing.id, body);
      return createSalon(body);
    },
    onSuccess: async () => {
      toast.success(editing ? "Salon güncellendi" : "Salon oluşturuldu");
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["salons"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => deleteSalon(id),
    onSuccess: async () => {
      toast.success("Salon pasifleştirildi");
      setDeleting(null);
      await qc.invalidateQueries({ queryKey: ["salons"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const rows = useMemo(() => salonsQuery.data ?? [], [salonsQuery.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Salonlar</h1>
          <p className="text-muted-foreground text-sm">
            Salon kayıtlarını yönetin ve detay sayfasından ayarları düzenleyin.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            resetFor(null);
            setOpen(true);
          }}
        >
          <Plus />
          Yeni salon
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            isLoading={salonsQuery.isLoading}
            getRowId={(r) => r.id}
            empty={
              <EmptyState
                title="Henüz salon yok"
                description="İlk salon kaydını oluşturarak başlayın."
                action={
                  <Button
                    onClick={() => {
                      setEditing(null);
                      resetFor(null);
                      setOpen(true);
                    }}
                  >
                    <Plus />
                    Yeni salon
                  </Button>
                }
              />
            }
            columns={[
              { id: "name", header: "Ad", cell: (r) => r.name },
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
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/salons/${r.id}`}>Ayarlar</Link>
                    </Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Salon düzenle" : "Yeni salon"}</DialogTitle>
            <DialogDescription>
              Temel bilgileri kaydedin; logo ve çalışma saatleri için salon detayına
              gidin.
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
          >
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
              <Label htmlFor="address">Adres</Label>
              <Input id="address" {...form.register("address")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" {...form.register("phone")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" {...form.register("email")} />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
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
        title="Salonu pasifleştir?"
        description="Bu işlem salonu listede pasif duruma alır (soft delete)."
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
