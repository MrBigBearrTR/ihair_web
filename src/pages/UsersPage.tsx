import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { getApiErrorMessage } from "@/api/client";
import { listEmployees } from "@/api/employees";
import { listSalons } from "@/api/salons";
import { createUser, listUsers, updateUserSalons } from "@/api/users";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROLE_LABELS } from "@/lib/labels";
import { cacheTimes, queryKeys } from "@/lib/queryKeys";
import type { Role, Salon, User } from "@/types/domain";

const schema = z.object({
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalı"),
  firstName: z.string().min(1, "Ad gerekli"),
  lastName: z.string().min(1, "Soyad gerekli"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  role: z.enum(["ADMIN", "SALON_OWNER", "EMPLOYEE", "CUSTOMER"]),
  salonIds: z.array(z.number()),
  defaultSalonId: z.number().optional(),
  employeeId: z.number().optional(),
}).superRefine((value, ctx) => {
  if (value.role === "SALON_OWNER" && value.salonIds.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["salonIds"],
      message: "En az bir salon seçin",
    });
  }
  if (value.role === "SALON_OWNER" && value.defaultSalonId == null) {
    ctx.addIssue({
      code: "custom",
      path: ["defaultSalonId"],
      message: "Varsayılan salon seçin",
    });
  }
  if (
    value.role === "SALON_OWNER" &&
    value.defaultSalonId != null &&
    !value.salonIds.includes(value.defaultSalonId)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["defaultSalonId"],
      message: "Varsayılan salon, atanmış salonlardan biri olmalıdır",
    });
  }
  if (value.role === "EMPLOYEE" && !value.employeeId) {
    ctx.addIssue({
      code: "custom",
      path: ["employeeId"],
      message: "Çalışan seçin",
    });
  }
});

type FormValues = z.infer<typeof schema>;

function SalonAssignmentFields({
  salons,
  selectedIds,
  defaultSalonId,
  onSelectedIdsChange,
  onDefaultSalonChange,
}: {
  salons: Salon[];
  selectedIds: number[];
  defaultSalonId?: number;
  onSelectedIdsChange: (ids: number[]) => void;
  onDefaultSalonChange: (id: number | undefined) => void;
}) {
  return (
    <fieldset className="grid gap-3 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">Yetkili salonlar</legend>
      {salons.map((salon) => (
        <label key={salon.id} className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={selectedIds.includes(salon.id)}
            onChange={(event) => {
              const next = event.target.checked
                ? [...selectedIds, salon.id]
                : selectedIds.filter((id) => id !== salon.id);
              onSelectedIdsChange(next);
              if (!next.includes(defaultSalonId ?? -1)) {
                onDefaultSalonChange(next[0]);
              }
            }}
          />
          {salon.name}
        </label>
      ))}
      <div className="grid gap-2">
        <Label>Varsayılan salon</Label>
        <Select
          value={defaultSalonId ? String(defaultSalonId) : ""}
          onValueChange={(value) => onDefaultSalonChange(Number(value))}
          disabled={selectedIds.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Varsayılan salon seçin" />
          </SelectTrigger>
          <SelectContent>
            {salons
              .filter((salon) => selectedIds.includes(salon.id))
              .map((salon) => (
                <SelectItem key={salon.id} value={String(salon.id)}>
                  {salon.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </fieldset>
  );
}

export function UsersPage() {
  const qc = useQueryClient();
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const salonsQuery = useQuery({
    queryKey: queryKeys.reference.salons,
    queryFn: listSalons,
    staleTime: cacheTimes.reference,
  });
  const [assignmentUser, setAssignmentUser] = useState<User | null>(null);
  const [assignmentSalonIds, setAssignmentSalonIds] = useState<number[]>([]);
  const [assignmentDefaultSalonId, setAssignmentDefaultSalonId] = useState<
    number | undefined
  >();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      firstName: "",
      lastName: "",
      password: "",
      role: "EMPLOYEE",
      salonIds: [],
      defaultSalonId: undefined,
      employeeId: undefined,
    },
  });
  const role = form.watch("role");
  const salonIds = form.watch("salonIds");
  const defaultSalonId = form.watch("defaultSalonId");
  const employeesQuery = useQuery({
    queryKey: queryKeys.reference.employees(undefined),
    queryFn: () => listEmployees(),
    staleTime: cacheTimes.reference,
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      await createUser({
        username: values.username,
        firstName: values.firstName,
        lastName: values.lastName,
        password: values.password,
        role: values.role as Role,
        salonId:
          values.role === "SALON_OWNER" ? values.defaultSalonId ?? null : null,
        salonIds: values.role === "SALON_OWNER" ? values.salonIds : [],
        defaultSalonId:
          values.role === "SALON_OWNER" ? values.defaultSalonId ?? null : null,
        employeeId: values.role === "EMPLOYEE" ? values.employeeId : null,
      });
    },
    onSuccess: async () => {
      toast.success("Kullanıcı oluşturuldu");
      form.reset({
        username: "",
        firstName: "",
        lastName: "",
        password: "",
        role: "EMPLOYEE",
        salonIds: [],
        defaultSalonId: undefined,
        employeeId: undefined,
      });
      await qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const assignmentMutation = useMutation({
    mutationFn: async () => {
      if (!assignmentUser) throw new Error("Kullanıcı seçilmedi");
      if (assignmentSalonIds.length === 0) throw new Error("En az bir salon seçin");
      if (
        assignmentDefaultSalonId == null ||
        !assignmentSalonIds.includes(assignmentDefaultSalonId)
      ) {
        throw new Error("Geçerli bir varsayılan salon seçin");
      }
      return updateUserSalons(assignmentUser.id, {
        salonIds: assignmentSalonIds,
        defaultSalonId: assignmentDefaultSalonId,
      });
    },
    onSuccess: async () => {
      toast.success("Salon yetkileri güncellendi");
      setAssignmentUser(null);
      await qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Salon yetkileri güncellenemedi")),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kullanıcılar</h1>
        <p className="text-muted-foreground text-sm">
          Sistem kullanıcılarını görüntüleyin ve yetkilerine göre yeni hesap oluşturun.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kullanıcı listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={usersQuery.data ?? []}
            isLoading={usersQuery.isLoading}
            getRowId={(user) => user.id}
            empty={
              <EmptyState
                title="Kullanıcı bulunamadı"
                description="Henüz görüntülenecek kullanıcı kaydı yok."
              />
            }
            columns={[
              { id: "username", header: "Kullanıcı adı", cell: (user) => user.username },
              {
                id: "name",
                header: "Ad soyad",
                cell: (user) => `${user.firstName} ${user.lastName}`.trim() || "—",
              },
              {
                id: "role",
                header: "Rol",
                cell: (user) => (
                  <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
                ),
              },
              {
                id: "salon",
                header: "Salonlar",
                cell: (user) => {
                  const ids =
                    user.salonIds?.length
                      ? user.salonIds
                      : user.salons?.map((salon) => salon.id).length
                        ? user.salons.map((salon) => salon.id)
                        : user.salonId
                          ? [user.salonId]
                          : [];
                  return ids
                    .map(
                      (id) =>
                        salonsQuery.data?.find((salon) => salon.id === id)?.name ??
                        `Salon #${id}`,
                    )
                    .join(", ") || "—";
                },
              },
              {
                id: "employee",
                header: "Çalışan",
                cell: (user) => {
                  const employee = employeesQuery.data?.find(
                    (item) => item.id === user.employeeId,
                  );
                  return employee
                    ? `${employee.firstName} ${employee.lastName}`
                    : "—";
                },
              },
              {
                id: "active",
                header: "Durum",
                cell: (user) =>
                  user.active === false ? (
                    <Badge variant="outline">Pasif</Badge>
                  ) : (
                    <Badge variant="secondary">Aktif</Badge>
                  ),
              },
              {
                id: "actions",
                header: "",
                className: "w-[1%] whitespace-nowrap text-right",
                cell: (user) =>
                  user.role === "SALON_OWNER" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const ids =
                          user.salonIds?.length
                            ? user.salonIds
                            : user.salons?.map((salon) => salon.id).length
                              ? user.salons.map((salon) => salon.id)
                              : user.salonId
                                ? [user.salonId]
                                : [];
                        setAssignmentUser(user);
                        setAssignmentSalonIds(ids);
                        setAssignmentDefaultSalonId(user.salonId ?? ids[0]);
                      }}
                    >
                      Salonları düzenle
                    </Button>
                  ) : null,
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Yeni kullanıcı</CardTitle>
          <CardDescription>
            Oluşturulan kullanıcı, seçtiğiniz rol ile sisteme giriş yapabilir.
          </CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Kullanıcı adı</Label>
              <Input id="username" autoComplete="off" {...form.register("username")} />
              {form.formState.errors.username?.message ? (
                <p className="text-destructive text-sm">
                  {form.formState.errors.username.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
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

            <div className="grid gap-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...form.register("password")}
              />
              {form.formState.errors.password?.message ? (
                <p className="text-destructive text-sm">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Rol</Label>
              <Select
                value={form.watch("role")}
                onValueChange={(v) =>
                  form.setValue("role", v as Role, { shouldValidate: true })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {role === "SALON_OWNER" ? (
              <div className="grid gap-2">
                <SalonAssignmentFields
                  salons={salonsQuery.data ?? []}
                  selectedIds={salonIds}
                  defaultSalonId={defaultSalonId}
                  onSelectedIdsChange={(ids) =>
                    form.setValue("salonIds", ids, { shouldValidate: true })
                  }
                  onDefaultSalonChange={(id) =>
                    form.setValue("defaultSalonId", id, { shouldValidate: true })
                  }
                />
                {form.formState.errors.salonIds?.message ? (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.salonIds.message}
                  </p>
                ) : null}
                {form.formState.errors.defaultSalonId?.message ? (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.defaultSalonId.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            {role === "EMPLOYEE" ? (
              <div className="grid gap-2">
                <Label>Çalışan</Label>
                <Select
                  value={form.watch("employeeId") ? String(form.watch("employeeId")) : ""}
                  onValueChange={(value) =>
                    form.setValue("employeeId", Number(value), {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Çalışan seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {(employeesQuery.data ?? []).map((employee) => (
                      <SelectItem key={employee.id} value={String(employee.id)}>
                        {employee.firstName} {employee.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.employeeId?.message ? (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.employeeId.message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Oluşturuluyor…" : "Kullanıcı oluştur"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Dialog open={Boolean(assignmentUser)} onOpenChange={(open) => !open && setAssignmentUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salon yetkilerini düzenle</DialogTitle>
            <DialogDescription>
              {assignmentUser?.username} için erişilebilen salonları ve varsayılanı seçin.
            </DialogDescription>
          </DialogHeader>
          <SalonAssignmentFields
            salons={salonsQuery.data ?? []}
            selectedIds={assignmentSalonIds}
            defaultSalonId={assignmentDefaultSalonId}
            onSelectedIdsChange={setAssignmentSalonIds}
            onDefaultSalonChange={setAssignmentDefaultSalonId}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAssignmentUser(null)}>
              Vazgeç
            </Button>
            <Button
              type="button"
              disabled={assignmentMutation.isPending || assignmentSalonIds.length === 0}
              onClick={() => assignmentMutation.mutate()}
            >
              {assignmentMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
