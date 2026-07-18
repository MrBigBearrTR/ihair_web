import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
} from "@/api/employees";
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
import type { Employee, EmployeeRequest } from "@/types/domain";
import { useAuthStore } from "@/stores/authStore";

const schema = z.object({
  salonId: z.coerce.number().optional(),
  firstName: z.string().min(1, "Ad gerekli"),
  lastName: z.string().min(1, "Soyad gerekli"),
  phone: z.string().optional(),
  email: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function toRequest(values: FormValues, salonId: number | undefined): EmployeeRequest {
  return {
    salonId: values.salonId ?? salonId,
    firstName: values.firstName,
    lastName: values.lastName,
    phone: values.phone || null,
    email: values.email || null,
  };
}

export function EmployeesPage() {
  const qc = useQueryClient();
  const isAdmin = useAuthStore((state) => state.role === "ADMIN");
  const activeSalonId = useAuthStore((state) => state.activeSalonId);
  const authorizedSalons = useAuthStore((state) => state.authorizedSalons);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);

  const employeesQuery = useQuery({
    queryKey: ["employees", activeSalonId],
    queryFn: () => listEmployees(activeSalonId ?? undefined),
    enabled: isAdmin || activeSalonId != null,
  });

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      salonId: 0,
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
    },
  });

  const resetFor = (emp?: Employee | null) => {
    if (!emp) {
      form.reset({
        salonId: activeSalonId ?? undefined,
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
      });
      return;
    }
    form.reset({
      salonId: emp.salonId,
      firstName: emp.firstName,
      lastName: emp.lastName,
      phone: emp.phone ?? "",
      email: emp.email ?? "",
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const targetSalonId = values.salonId ?? activeSalonId ?? undefined;
      if (!targetSalonId) throw new Error("İşlem için salon seçin");
      const body = toRequest(values, targetSalonId);
      if (editing) return updateEmployee(editing.id, body);
      return createEmployee(body);
    },
    onSuccess: async () => {
      toast.success(editing ? "Çalışan güncellendi" : "Çalışan oluşturuldu");
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => deleteEmployee(id),
    onSuccess: async () => {
      toast.success("Çalışan pasifleştirildi");
      setDeleting(null);
      await qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const rows = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);

  if (authorizedSalons.length === 0) {
    return (
      <EmptyState
        title="Yetkili salon bulunamadı"
        description="Çalışanları yönetmek için hesabınıza bir salon atanmalıdır."
      />
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Çalışanlar</h1>
          <p className="text-muted-foreground text-sm">
            Salon bazlı çalışan kayıtlarını yönetin.
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
            Yeni çalışan
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
            isLoading={employeesQuery.isLoading}
            getRowId={(r) => r.id}
            empty={
              <EmptyState
                title="Çalışan bulunamadı"
                description="Filtreyi değiştirin veya yeni çalışan ekleyin."
                action={
                  <Button
                    onClick={() => {
                      setEditing(null);
                      resetFor(null);
                      setOpen(true);
                    }}
                  >
                    <Plus />
                    Yeni çalışan
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
              {
                id: "salon",
                header: "Salon",
                cell: (r) => {
                  const s = authorizedSalons.find((x) => x.id === r.salonId);
                  return s?.name ?? `Salon #${r.salonId}`;
                },
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Çalışan düzenle" : "Yeni çalışan"}</DialogTitle>
            <DialogDescription>Çalışanı bir salona bağlayın.</DialogDescription>
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
        title="Çalışanı pasifleştir?"
        description="Bu işlem çalışanı pasif duruma alır."
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
