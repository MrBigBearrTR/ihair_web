import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { RoleGuard } from "@/routes/RoleGuard";
import { AppointmentsPage } from "@/pages/AppointmentsPage";
import { CampaignValidatePage } from "@/pages/CampaignValidatePage";
import { CampaignsPage } from "@/pages/CampaignsPage";
import { ChangePasswordPage } from "@/pages/ChangePasswordPage";
import { CustomersPage } from "@/pages/CustomersPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { EmployeesPage } from "@/pages/EmployeesPage";
import { HairServicesPage } from "@/pages/HairServicesPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotAuthorizedPage } from "@/pages/NotAuthorizedPage";
import { SalonDetailPage } from "@/pages/SalonDetailPage";
import { SalonsPage } from "@/pages/SalonsPage";
import { UsersPage } from "@/pages/UsersPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />

        <Route
          path="/salons"
          element={
            <RoleGuard roles={["ADMIN", "SALON_OWNER"]}>
              <SalonsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/salons/:salonId"
          element={
            <RoleGuard roles={["ADMIN", "SALON_OWNER"]}>
              <SalonDetailPage />
            </RoleGuard>
          }
        />

        <Route
          path="/employees"
          element={
            <RoleGuard roles={["ADMIN", "SALON_OWNER"]}>
              <EmployeesPage />
            </RoleGuard>
          }
        />
        <Route
          path="/hair-services"
          element={
            <RoleGuard roles={["ADMIN", "SALON_OWNER"]}>
              <HairServicesPage />
            </RoleGuard>
          }
        />

        <Route
          path="/customers"
          element={
            <RoleGuard roles={["ADMIN", "SALON_OWNER", "EMPLOYEE"]}>
              <CustomersPage />
            </RoleGuard>
          }
        />
        <Route
          path="/appointments"
          element={
            <RoleGuard roles={["ADMIN", "SALON_OWNER", "EMPLOYEE"]}>
              <AppointmentsPage />
            </RoleGuard>
          }
        />

        <Route
          path="/campaigns"
          element={
            <RoleGuard roles={["ADMIN", "SALON_OWNER"]}>
              <CampaignsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/campaign-validate"
          element={
            <RoleGuard roles={["ADMIN", "SALON_OWNER", "EMPLOYEE"]}>
              <CampaignValidatePage />
            </RoleGuard>
          }
        />

        <Route
          path="/users"
          element={
            <RoleGuard roles={["ADMIN"]}>
              <UsersPage />
            </RoleGuard>
          }
        />
      </Route>

      <Route path="/not-authorized" element={<NotAuthorizedPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
