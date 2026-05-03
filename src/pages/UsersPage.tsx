import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { register as registerUser } from "@/api/auth";
import { getApiErrorMessage } from "@/api/client";
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
import type { Role } from "@/types/domain";

const schema = z.object({
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalı"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
  role: z.enum(["ADMIN", "SALON_OWNER", "EMPLOYEE", "CUSTOMER"]),
});

type FormValues = z.infer<typeof schema>;

export function UsersPage() {
  const qc = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      password: "",
      role: "EMPLOYEE",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      await registerUser({
        username: values.username,
        password: values.password,
        role: values.role as Role,
      });
    },
    onSuccess: async () => {
      toast.success("Kullanıcı oluşturuldu");
      form.reset({ username: "", password: "", role: "EMPLOYEE" });
      await qc.invalidateQueries();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kullanıcılar</h1>
        <p className="text-muted-foreground text-sm">
          Sadece <code>ADMIN</code> rolü yeni kullanıcı oluşturabilir.
        </p>
      </div>

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
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="SALON_OWNER">SALON_OWNER</SelectItem>
                  <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
                  <SelectItem value="CUSTOMER">CUSTOMER</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Oluşturuluyor…" : "Kullanıcı oluştur"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
