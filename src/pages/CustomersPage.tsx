import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from "@/api/customers";
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
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/useDebounce";
import type { Customer, CustomerRequest } from "@/types/domain";

const schema = z.object({
  firstName: z.string().min(1, "Ad gerekli"),
  lastName: z.string().min(1, "Soyad gerekli"),
  phone: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toRequest(values: FormValues): CustomerRequest {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    phone: values.phone || null,
    email: values.email || null,
    notes: values.notes || null,
  };
}

export function CustomersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const debounced = useDebounce(q, 250);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: listCustomers,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      notes: "",
    },
  });

  const resetFor = (c?: Customer | null) => {
    if (!c) {
      form.reset({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        notes: "",
      });
      return;
    }
    form.reset({
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone ?? "",
      email: c.email ?? "",
      notes: c.notes ?? "",
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const body = toRequest(values);
      if (editing) return updateCustomer(editing.id, body);
      return createCustomer(body);
    },
    onSuccess: async () => {
      toast.success(editing ? "Müşteri güncellendi" : "Müşteri oluşturuldu");
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => deleteCustomer(id),
    onSuccess: async () => {
      toast.success("Müşteri pasifleştirildi");
      setDeleting(null);
      await qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const rows = useMemo(() => {
    const all = customersQuery.data ?? [];
    const needle = debounced.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((c) => {
      const hay = `${c.firstName} ${c.lastName} ${c.phone ?? ""} ${c.email ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [customersQuery.data, debounced]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Müşteriler</h1>
          <p className="text-muted-foreground text-sm">
            Müşteri kayıtlarını arayın ve yönetin.
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
          Yeni müşteri
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Liste</CardTitle>
            <div className="w-full sm:max-w-sm">
              <Label htmlFor="search" className="sr-only">
                Ara
              </Label>
              <Input
                id="search"
                placeholder="Ad, soyad, telefon veya e-posta…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            isLoading={customersQuery.isLoading}
            getRowId={(r) => r.id}
            empty={
              <EmptyState
                title="Kayıt yok"
                description="Arama kriterlerinizi değiştirin veya yeni müşteri ekleyin."
                action={
                  <Button
                    onClick={() => {
                      setEditing(null);
                      resetFor(null);
                      setOpen(true);
                    }}
                  >
                    <Plus />
                    Yeni müşteri
                  </Button>
                }
              />
            }
            columns={[
              {
                id: "name",
                header: "Ad Soyad",
                cell: (r) => `${r.firstName} ${r.lastName}`,
              },
              { id: "phone", header: "Telefon", cell: (r) => r.phone ?? "—" },
              { id: "email", header: "E-posta", cell: (r) => r.email ?? "—" },
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
            <DialogTitle>{editing ? "Müşteri düzenle" : "Yeni müşteri"}</DialogTitle>
            <DialogDescription>Müşteri iletişim bilgilerini kaydedin.</DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
          >
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">Ad</Label>
                <Input id="firstName" {...form.register("firstName")} />
                {form.formState.errors.firstName?.message ? (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.firstName.message}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Soyad</Label>
                <Input id="lastName" {...form.register("lastName")} />
                {form.formState.errors.lastName?.message ? (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.lastName.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" {...form.register("phone")} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" {...form.register("email")} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea id="notes" rows={4} {...form.register("notes")} />
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
        title="Müşteriyi pasifleştir?"
        description="Bu işlem müşteriyi pasif duruma alır (soft delete)."
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
