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
import { SalesPage } from "@/pages/SalesPage";
import { RevenuePage } from "@/pages/RevenuePage";
import { PAGE_ROLES } from "@/lib/access";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <RoleGuard roles={[...PAGE_ROLES.dashboard]}>
              <DashboardPage />
            </RoleGuard>
          }
        />
        <Route path="/change-password" element={<ChangePasswordPage />} />

        <Route
          path="/salons"
          element={
            <RoleGuard roles={[...PAGE_ROLES.salons]}>
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
            <RoleGuard roles={[...PAGE_ROLES.employees]}>
              <EmployeesPage />
            </RoleGuard>
          }
        />
        <Route
          path="/hair-services"
          element={
            <RoleGuard roles={[...PAGE_ROLES.hairServices]}>
              <HairServicesPage />
            </RoleGuard>
          }
        />

        <Route
          path="/customers"
          element={
            <RoleGuard roles={[...PAGE_ROLES.customers]}>
              <CustomersPage />
            </RoleGuard>
          }
        />
        <Route
          path="/appointments"
          element={
            <RoleGuard roles={[...PAGE_ROLES.appointments]}>
              <AppointmentsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/sales/*"
          element={
            <RoleGuard roles={[...PAGE_ROLES.sales]}>
              <SalesPage />
            </RoleGuard>
          }
        />
        <Route
          path="/revenue"
          element={
            <RoleGuard roles={[...PAGE_ROLES.revenue]}>
              <RevenuePage />
            </RoleGuard>
          }
        />

        <Route
          path="/campaigns"
          element={
            <RoleGuard roles={[...PAGE_ROLES.campaigns]}>
              <CampaignsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/campaign-validate"
          element={
            <RoleGuard roles={[...PAGE_ROLES.campaignValidate]}>
              <CampaignValidatePage />
            </RoleGuard>
          }
        />

        <Route
          path="/users"
          element={
            <RoleGuard roles={[...PAGE_ROLES.users]}>
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
