import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getGlobalLogo, getSalonLogo } from "@/api/branding";
import { cacheTimes, queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/stores/authStore";

export function useBlobObjectUrl(blob: Blob | null | undefined) {
  const [objectUrl, setObjectUrl] = useState<{
    blob: Blob;
    url: string;
  } | null>(null);

  useEffect(() => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const updateTimer = window.setTimeout(() => {
      setObjectUrl({ blob, url });
    }, 0);
    return () => {
      window.clearTimeout(updateTimer);
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  return objectUrl && objectUrl.blob === blob ? objectUrl.url : null;
}

export function useGlobalBranding() {
  const query = useQuery({
    queryKey: queryKeys.branding.globalLogo,
    queryFn: getGlobalLogo,
    staleTime: cacheTimes.branding,
    retry: 2,
  });
  const logoUrl = useBlobObjectUrl(query.data);

  return { ...query, logoUrl };
}

export function useActiveSalonBranding() {
  const activeSalonId = useAuthStore((state) => state.activeSalonId);
  const authorizedSalons = useAuthStore((state) => state.authorizedSalons);
  const salonName =
    activeSalonId == null
      ? "Tüm salonlar"
      : authorizedSalons.find((salon) => salon.id === activeSalonId)?.name ??
        `Salon #${activeSalonId}`;

  const query = useQuery({
    queryKey:
      activeSalonId == null
        ? [...queryKeys.branding.salonLogos, "none"]
        : queryKeys.branding.salonLogo(activeSalonId),
    queryFn: () => getSalonLogo(activeSalonId as number),
    enabled: activeSalonId != null,
    staleTime: cacheTimes.branding,
    retry: 2,
  });
  const logoUrl = useBlobObjectUrl(query.data);

  return {
    activeSalonId,
    salonName,
    logoUrl: activeSalonId == null ? null : logoUrl,
    isLogoLoading: activeSalonId != null && query.isPending,
  };
}

export type ActiveSalonBranding = ReturnType<typeof useActiveSalonBranding>;
