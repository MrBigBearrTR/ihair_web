import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { login } from "@/api/auth";
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
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>iHair</CardTitle>
          <CardDescription>Kuaför yönetim paneline giriş yapın</CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
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
          <CardFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Giriş yapılıyor…" : "Giriş yap"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
