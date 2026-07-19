import { Scissors } from "lucide-react";
import { useState } from "react";

import type { ActiveSalonBranding } from "@/hooks/useBranding";
import { cn } from "@/lib/utils";

export function BrandLogo({
  src,
  name,
  className,
  imageClassName,
  fallback = "initial",
}: {
  src: string | null;
  name: string;
  className?: string;
  imageClassName?: string;
  fallback?: "initial" | "app";
}) {
  const initial = name.trim().charAt(0).toLocaleUpperCase("tr-TR") || "İ";
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src != null && failedSrc !== src;

  return (
    <span
      className={cn(
        "bg-primary text-primary-foreground flex shrink-0 items-center justify-center overflow-hidden rounded-xl",
        className,
      )}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt=""
          className={cn("size-full object-contain", imageClassName)}
          onError={() => setFailedSrc(src)}
        />
      ) : fallback === "app" ? (
        <Scissors className="size-1/2" />
      ) : (
        <span className="text-sm font-semibold">{initial}</span>
      )}
    </span>
  );
}

export function BrandWatermark({
  src,
  className,
}: {
  src: string | null;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) return null;

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={className}
      onError={() => setFailedSrc(src)}
    />
  );
}

export function SalonBrandHeader({
  branding,
  compact = false,
}: {
  branding: ActiveSalonBranding;
  compact?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <BrandLogo
        src={branding.isLogoLoading ? null : branding.logoUrl}
        name={branding.salonName}
        className={compact ? "size-10" : "size-12"}
      />
      <span className="min-w-0 text-left leading-tight">
        <span className="block truncate font-semibold tracking-tight">
          {branding.salonName}
        </span>
        <span className="text-muted-foreground block text-xs font-normal">
          Salon yönetimi
        </span>
      </span>
    </span>
  );
}
