import {
  CalendarDays,
  CalendarRange,
  LayoutDashboard,
  Scissors,
  Settings2,
  Store,
  Tag,
  UserCog,
  UserRound,
  Users,
  BadgePercent,
  ChartNoAxesCombined,
  ShoppingBag,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SalonBrandHeader } from "@/components/branding/BrandLogo";
import type { ActiveSalonBranding } from "@/hooks/useBranding";
import { cn } from "@/lib/utils";
import { canAccess, type PageKey } from "@/lib/access";
import { useAuthStore } from "@/stores/authStore";

const items: {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  page: PageKey;
}[] = [
  {
    label: "Panel",
    to: "/dashboard",
    icon: LayoutDashboard,
    page: "dashboard",
  },
  {
    label: "Salonlar",
    to: "/salons",
    icon: Store,
    page: "salons",
  },
  {
    label: "Çalışanlar",
    to: "/employees",
    icon: UserRound,
    page: "employees",
  },
  {
    label: "Hizmetler",
    to: "/hair-services",
    icon: Scissors,
    page: "hairServices",
  },
  {
    label: "Müşteriler",
    to: "/customers",
    icon: Users,
    page: "customers",
  },
  {
    label: "Randevular",
    to: "/appointments",
    icon: CalendarDays,
    page: "appointments",
  },
  {
    label: "Satışlar",
    to: "/sales/new",
    icon: ShoppingBag,
    page: "sales",
  },
  {
    label: "Gelir raporu",
    to: "/revenue",
    icon: ChartNoAxesCombined,
    page: "revenue",
  },
  {
    label: "Kampanyalar",
    to: "/campaigns",
    icon: Tag,
    page: "campaigns",
  },
  {
    label: "Kampanya doğrula",
    to: "/campaign-validate",
    icon: BadgePercent,
    page: "campaignValidate",
  },
  {
    label: "Kullanıcılar",
    to: "/users",
    icon: UserCog,
    page: "users",
  },
];

function linkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
    isActive
      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );
}

export function NavItems({
  onNavigate,
  mobile = false,
  className,
}: {
  onNavigate?: () => void;
  mobile?: boolean;
  className?: string;
}) {
  const role = useAuthStore((s) => s.role);
  const activeSalonId = useAuthStore((s) => s.activeSalonId);
  const filtered = [
    ...items.filter((item) => canAccess(role, item.page)),
    ...(role === "SALON_OWNER" && activeSalonId != null
      ? [
          {
            label: "Çalışma takvimi",
            to: `/salons/${activeSalonId}`,
            icon: CalendarRange,
            page: "appointments" as PageKey,
          },
        ]
      : []),
  ];

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {filtered.map((item) => {
        return (
          <div key={item.to}>
          <NavLink
            to={item.to}
            className={(state) =>
              cn(linkClass(state), mobile && !state.isActive && "text-foreground")
            }
            onClick={() => {
              onNavigate?.();
            }}
          >
            <item.icon className="size-[18px]" />
            {item.label}
          </NavLink>
          </div>
        );
      })}
    </nav>
  );
}

export function SidebarDesktop({
  branding,
}: {
  branding: ActiveSalonBranding;
}) {
  return (
    <aside className="bg-card/80 hidden w-64 shrink-0 border-r xl:flex xl:flex-col">
      <div className="flex min-h-20 min-w-0 items-center px-5 py-3">
        <SalonBrandHeader branding={branding} />
      </div>
      <Separator />
      <div className="overflow-y-auto p-3">
        <NavItems />
      </div>
    </aside>
  );
}

export function SidebarMobileTrigger({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="icon-sm"
      className="xl:hidden"
      type="button"
      aria-label="Menüyü aç"
      onClick={onOpen}
    >
      <Settings2 className="size-4" />
    </Button>
  );
}
