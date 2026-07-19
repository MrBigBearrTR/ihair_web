import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { login } from "@/api/auth";
import { getApiErrorMessage } from "@/api/client";
import { BrandLogo } from "@/components/branding/BrandLogo";
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
import { useGlobalBranding } from "@/hooks/useBranding";
import { useAuthStore } from "@/stores/authStore";

const schema = z.object({
  username: z.string().min(1, "Kullanıcı adı gerekli"),
  password: z.string().min(1, "Şifre gerekli"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAuth = useAuthStore((s) => s.setAuth);
  const { logoUrl } = useGlobalBranding();

  const from =
    (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const data = await login(values);
      setAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        role: data.role,
        expiresAt: data.expiresAt,
        username: values.username,
        salonId: data.salonId,
        salonIds: data.salonIds ?? [],
        salons: data.salons ?? [],
        employeeId: data.employeeId,
      });
      return { username: values.username };
    },
    onSuccess: ({ username }) => {
      toast.success("Giriş başarılı");
      if (username.toLowerCase() === "admin") {
        navigate("/change-password", { replace: true });
        return;
      }
      navigate(from.startsWith("/login") ? "/dashboard" : from, {
        replace: true,
      });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Giriş başarısız"));
    },
  });

  if (accessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-linear-to-br from-background via-accent/35 to-secondary/50 p-4 sm:p-6">
      <Card className="grid w-full max-w-4xl overflow-hidden p-0 md:min-h-[34rem] md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="from-primary/90 via-accent to-secondary flex min-h-48 items-center justify-center bg-linear-to-br p-8 md:min-h-full md:p-12">
          <div className="flex max-w-64 flex-col items-center gap-5 text-center">
            <BrandLogo
              src={logoUrl}
              name="iHair"
              fallback="app"
              className="size-32 rounded-3xl bg-card/20 text-foreground shadow-lg ring-1 ring-white/25 sm:size-40"
              imageClassName="p-4"
            />
            {!logoUrl ? (
              <div>
                <p className="text-3xl font-semibold tracking-tight">iHair</p>
                <p className="mt-1 text-sm text-foreground/75">
                  Salon yönetimi
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <form
          className="flex min-w-0 flex-col justify-center py-8 sm:py-12"
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        >
          <CardHeader>
            <CardTitle className="text-2xl">Giriş yap</CardTitle>
            <CardDescription>Kuaför yönetim paneline giriş yapın</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Kullanıcı adı</Label>
              <Input
                id="username"
                autoComplete="username"
                {...form.register("username")}
              />
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
                autoComplete="current-password"
                {...form.register("password")}
              />
              {form.formState.errors.password?.message ? (
                <p className="text-destructive text-sm">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>
          </CardContent>
          <CardFooter className="mt-6">
            <Button className="w-full" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Giriş yapılıyor…" : "Giriş yap"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
