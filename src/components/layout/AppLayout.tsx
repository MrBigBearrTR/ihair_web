import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Header } from "@/components/layout/Header";
import { NavItems, SidebarDesktop } from "@/components/layout/Sidebar";
import {
  BrandWatermark,
  SalonBrandHeader,
} from "@/components/branding/BrandLogo";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActiveSalonBranding } from "@/hooks/useBranding";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const branding = useActiveSalonBranding();

  return (
    <div className="bg-background flex min-h-svh w-full">
      <SidebarDesktop branding={branding} />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(22rem,85vw)] overflow-y-auto p-0">
          <SheetHeader className="border-b p-4 text-left">
            <SheetTitle className="min-w-0 pr-7">
              <SalonBrandHeader branding={branding} compact />
            </SheetTitle>
          </SheetHeader>
          <div className="p-3">
            <NavItems
              mobile
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="relative isolate flex min-w-0 flex-1 flex-col">
        {branding.activeSalonId != null && !branding.isLogoLoading ? (
          <BrandWatermark
            src={branding.logoUrl}
            className="pointer-events-none absolute right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] -z-10 max-h-48 max-w-48 object-contain opacity-[0.06] md:max-h-64 md:max-w-64"
          />
        ) : null}
        <Header
          branding={branding}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        <main className="relative z-0 mx-auto w-full max-w-[1440px] flex-1 p-4 md:p-6 xl:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
