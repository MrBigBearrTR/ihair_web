import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";

import type { Role } from "@/types/domain";
import { useAuthStore } from "@/stores/authStore";

export function RoleGuard({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const role = useAuthStore((s) => s.role);

  if (!role || !roles.includes(role)) {
    return <Navigate to="/not-authorized" replace />;
  }

  return children;
}
