import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { logout as logoutApi } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";

export function useAuth() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const username = useAuthStore((s) => s.username);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await logoutApi();
      } catch {
        // sunucu hatası olsa bile oturumu yerelde kapat
      }
    },
    onSettled: () => {
      clearAuth();
      navigate("/login", { replace: true });
    },
  });

  return {
    accessToken,
    role,
    username,
    isAuthenticated: Boolean(accessToken),
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
  };
}
