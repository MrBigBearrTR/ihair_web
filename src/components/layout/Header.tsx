import { LogOut, Moon, Sun, KeyRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/labels";
import { cacheTimes, queryKeys } from "@/lib/queryKeys";
import { listSalons } from "@/api/salons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/authStore";
import { BrandLogo } from "@/components/branding/BrandLogo";
import type { ActiveSalonBranding } from "@/hooks/useBranding";

export function Header({
  onOpenMobileNav,
  branding,
}: {
  onOpenMobileNav: () => void;
  branding: ActiveSalonBranding;
}) {
  const { username, role, logout, isLoggingOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const authorizedSalons = useAuthStore((state) => state.authorizedSalons);
  const activeSalonId = useAuthStore((state) => state.activeSalonId);
  const setActiveSalon = useAuthStore((state) => state.setActiveSalon);
  const setAuthorizedSalons = useAuthStore((state) => state.setAuthorizedSalons);
  const salonsQuery = useQuery({
    queryKey: queryKeys.reference.salons,
    queryFn: listSalons,
    enabled: role === "ADMIN",
    staleTime: cacheTimes.reference,
  });

  useEffect(() => {
    if (role === "ADMIN" && salonsQuery.data) {
      setAuthorizedSalons(salonsQuery.data.map(({ id, name }) => ({ id, name })));
    }
  }, [role, salonsQuery.data, setAuthorizedSalons]);

  const initials =
    (username ?? "?")
      .split(/[._\s-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";

  return (
    <header className="bg-background/85 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-40 flex h-16 min-w-0 items-center gap-2 border-b px-4 backdrop-blur-xl md:gap-3 md:px-6">
      <Button
        variant="outline"
        size="icon-sm"
        className="shrink-0 xl:hidden"
        type="button"
        aria-label="Menüyü aç"
        onClick={onOpenMobileNav}
      >
        <span className="sr-only">Menü</span>
        <span className="text-sm font-semibold">≡</span>
      </Button>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {authorizedSalons.length === 0 ? (
          <span className="text-destructive hidden text-xs sm:inline">
            Yetkili salon bulunamadı
          </span>
        ) : authorizedSalons.length === 1 && role !== "ADMIN" ? (
          <span className="text-muted-foreground hidden min-w-0 items-center gap-2 text-sm sm:flex">
            <BrandLogo
              src={branding.isLogoLoading ? null : branding.logoUrl}
              name={branding.salonName}
              className="size-7 rounded-lg xl:hidden"
            />
            <span className="max-w-44 truncate">{authorizedSalons[0].name}</span>
          </span>
        ) : (
          <Select
            value={activeSalonId == null ? "all" : String(activeSalonId)}
            onValueChange={(value) =>
              setActiveSalon(value === "all" ? null : Number(value))
            }
          >
            <SelectTrigger
              className="h-10 min-w-0 flex-1 rounded-xl bg-card shadow-xs sm:max-w-[220px]"
              aria-label="Aktif salon"
            >
              {branding.activeSalonId != null ? (
                <BrandLogo
                  src={branding.isLogoLoading ? null : branding.logoUrl}
                  name={branding.salonName}
                  className="size-7 rounded-lg xl:hidden"
                />
              ) : null}
              <SelectValue placeholder="Salon seçin" />
            </SelectTrigger>
            <SelectContent>
              {role === "ADMIN" ? <SelectItem value="all">Tüm salonlar</SelectItem> : null}
              {authorizedSalons.map((salon) => (
                <SelectItem key={salon.id} value={String(salon.id)}>
                  {salon.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {role ? (
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {ROLE_LABELS[role]}
          </Badge>
        ) : null}

        <Button
          variant="outline"
          size="icon-sm"
          type="button"
          aria-label="Tema değiştir"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="dark:hidden size-4" />
          <Moon className="hidden size-4 dark:inline" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="size-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[160px] truncate text-sm font-medium xl:inline">
                {username}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span className="truncate">{username}</span>
                <span className="text-muted-foreground text-xs font-normal">
                  {role ? ROLE_LABELS[role] : ""}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/change-password" className="cursor-pointer">
                <KeyRound />
                Şifre değiştir
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={isLoggingOut}
              onClick={() => logout()}
            >
              <LogOut />
              Çıkış yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
