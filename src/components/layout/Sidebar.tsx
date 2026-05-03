import {
  CalendarDays,
  LayoutDashboard,
  Scissors,
  Settings2,
  Store,
  Tag,
  UserCog,
  UserRound,
  Users,
  BadgePercent,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/types/domain";

const items: {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}[] = [
  {
    label: "Panel",
    to: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "SALON_OWNER", "EMPLOYEE"],
  },
  {
    label: "Salonlar",
    to: "/salons",
    icon: Store,
    roles: ["ADMIN", "SALON_OWNER"],
  },
  {
    label: "Çalışanlar",
    to: "/employees",
    icon: UserRound,
    roles: ["ADMIN", "SALON_OWNER"],
  },
  {
    label: "Hizmetler",
    to: "/hair-services",
    icon: Scissors,
    roles: ["ADMIN", "SALON_OWNER"],
  },
  {
    label: "Müşteriler",
    to: "/customers",
    icon: Users,
    roles: ["ADMIN", "SALON_OWNER", "EMPLOYEE"],
  },
  {
    label: "Randevular",
    to: "/appointments",
    icon: CalendarDays,
    roles: ["ADMIN", "SALON_OWNER", "EMPLOYEE"],
  },
  {
    label: "Kampanyalar",
    to: "/campaigns",
    icon: Tag,
    roles: ["ADMIN", "SALON_OWNER"],
  },
  {
    label: "Kampanya doğrula",
    to: "/campaign-validate",
    icon: BadgePercent,
    roles: ["ADMIN", "SALON_OWNER", "EMPLOYEE"],
  },
  {
    label: "Kullanıcılar",
    to: "/users",
    icon: UserCog,
    roles: ["ADMIN"],
  },
];

function linkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
  const filtered = items.filter((i) => role && i.roles.includes(role));

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {filtered.map((item) => {
        const inner = (
          <NavLink
            to={item.to}
            className={linkClass}
            onClick={() => {
              onNavigate?.();
            }}
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        );

        return mobile ? (
          <SheetClose key={item.to} asChild>
            {inner}
          </SheetClose>
        ) : (
          <div key={item.to}>{inner}</div>
        );
      })}
    </nav>
  );
}

export function SidebarDesktop() {
  return (
    <aside className="bg-card hidden w-64 shrink-0 border-r md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 px-4">
        <Settings2 className="text-primary size-5" />
        <div className="leading-tight">
          <div className="text-sm font-semibold">iHair</div>
          <div className="text-muted-foreground text-xs">Yönetim</div>
        </div>
      </div>
      <Separator />
      <div className="p-3">
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
      className="md:hidden"
      type="button"
      aria-label="Menüyü aç"
      onClick={onOpen}
    >
      <Settings2 className="size-4" />
    </Button>
  );
}
