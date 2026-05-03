import { LogOut, Moon, Sun, KeyRound } from "lucide-react";
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

export function Header({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { username, role, logout, isLoggingOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const initials =
    (username ?? "?")
      .split(/[._\s-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4 backdrop-blur md:px-6">
      <Button
        variant="outline"
        size="icon-sm"
        className="md:hidden"
        type="button"
        aria-label="Menüyü aç"
        onClick={onOpenMobileNav}
      >
        <span className="sr-only">Menü</span>
        <span className="text-sm font-semibold">≡</span>
      </Button>

      <div className="flex flex-1 items-center justify-end gap-2">
        {role ? (
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {role}
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
              <span className="hidden max-w-[160px] truncate text-sm font-medium md:inline">
                {username}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span className="truncate">{username}</span>
                <span className="text-muted-foreground text-xs font-normal">
                  {role}
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
