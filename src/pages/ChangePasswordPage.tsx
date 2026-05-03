import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { changePassword } from "@/api/auth";
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
import { useAuthStore } from "@/stores/authStore";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Mevcut şifre gerekli"),
    newPassword: z.string().min(6, "Yeni şifre en az 6 karakter olmalı"),
    confirmPassword: z.string().min(1, "Şifre tekrarı gerekli"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
    },
    onSuccess: () => {
      toast.success("Şifre güncellendi. Lütfen tekrar giriş yapın.");
      clearAuth();
      navigate("/login", { replace: true });
    },
    onError: (err) => {
      const msg = getApiErrorMessage(err, "Şifre değiştirilemedi");
      toast.error(msg);
    },
  });

  return (
    <div className="mx-auto w-full max-w-md py-6">
      <Card>
        <CardHeader>
          <CardTitle>Şifre değiştir</CardTitle>
          <CardDescription>
            Güvenlik için şifrenizi güçlü ve benzersiz tutun.
          </CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Mevcut şifre</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...form.register("currentPassword")}
              />
              {form.formState.errors.currentPassword?.message ? (
                <p className="text-destructive text-sm">
                  {form.formState.errors.currentPassword.message}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">Yeni şifre</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...form.register("newPassword")}
              />
              {form.formState.errors.newPassword?.message ? (
                <p className="text-destructive text-sm">
                  {form.formState.errors.newPassword.message}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Yeni şifre (tekrar)</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword?.message ? (
                <p className="text-destructive text-sm">
                  {form.formState.errors.confirmPassword.message}
                </p>
              ) : null}
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Vazgeç
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
