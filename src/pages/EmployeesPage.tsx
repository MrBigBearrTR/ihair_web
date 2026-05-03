import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
} from "@/api/employees";
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
import type { Employee, EmployeeRequest } from "@/types/domain";

const schema = z.object({
  salonId: z.coerce.number().min(1, "Salon seçin"),
  firstName: z.string().min(1, "Ad gerekli"),
  lastName: z.string().min(1, "Soyad gerekli"),
  phone: z.string().optional(),
  email: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toRequest(values: FormValues): EmployeeRequest {
  return {
    salonId: values.salonId,
    firstName: values.firstName,
    lastName: values.lastName,
    phone: values.phone || null,
    email: values.email || null,
  };
}

export function EmployeesPage() {
  const qc = useQueryClient();
  const [salonFilter, setSalonFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);

  const salonsQuery = useQuery({
    queryKey: ["salons"],
    queryFn: listSalons,
  });

  const salonIdNum =
    salonFilter === "all" ? undefined : Number(salonFilter);

  const employeesQuery = useQuery({
    queryKey: ["employees", salonIdNum],
    queryFn: () => listEmployees(salonIdNum),
  });

  const form = useForm<FormValues>({
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
      const firstSalonId = salonsQuery.data?.[0]?.id ?? 0;
      form.reset({
        salonId: firstSalonId,
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
      const body = toRequest(values);
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

  useEffect(() => {
    if (!open || editing) return;
    const first = salonsQuery.data?.[0]?.id;
    if (first && !form.getValues("salonId")) {
      form.setValue("salonId", first, { shouldValidate: true });
    }
  }, [open, editing, salonsQuery.data, form]);

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
          <div className="grid gap-1">
            <Label>Salon filtresi</Label>
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
                  const s = salonsQuery.data?.find((x) => x.id === r.salonId);
                  return s?.name ?? `#${r.salonId}`;
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
            <div className="grid gap-2">
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
                  {(salonsQuery.data ?? []).map((s) => (
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
            </div>

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
        description="Bu işlem çalışanı pasif duruma alır (soft delete)."
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
