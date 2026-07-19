import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  deleteGlobalLogo,
  deleteSalonLogo,
  getGlobalLogo,
  getSalonLogo,
  uploadGlobalLogo,
  uploadSalonLogo,
  validateLogoFile,
} from "@/api/branding";
import { getApiErrorMessage } from "@/api/client";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBlobObjectUrl } from "@/hooks/useBranding";
import { cacheTimes, queryKeys } from "@/lib/queryKeys";

type LogoScope =
  | { type: "global" }
  | { type: "salon"; salonId: number; salonName: string };

export function LogoManagerCard({ scope }: { scope: LogoScope }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isGlobal = scope.type === "global";
  const queryKey = isGlobal
    ? queryKeys.branding.globalLogo
    : queryKeys.branding.salonLogo(scope.salonId);

  const logoQuery = useQuery({
    queryKey,
    queryFn: () =>
      isGlobal ? getGlobalLogo() : getSalonLogo(scope.salonId),
    staleTime: cacheTimes.branding,
    retry: false,
  });
  const storedLogoUrl = useBlobObjectUrl(logoQuery.data);
  const selectedLogoUrl = useBlobObjectUrl(selectedFile);
  const previewUrl = selectedLogoUrl ?? storedLogoUrl;

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      isGlobal
        ? uploadGlobalLogo(file)
        : uploadSalonLogo(scope.salonId, file),
    onSuccess: async () => {
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await queryClient.invalidateQueries({ queryKey });
      toast.success(isGlobal ? "Uygulama logosu kaydedildi" : "Salon logosu kaydedildi");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Logo yüklenemedi")),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      isGlobal ? deleteGlobalLogo() : deleteSalonLogo(scope.salonId),
    onSuccess: async () => {
      setConfirmDelete(false);
      setSelectedFile(null);
      await queryClient.invalidateQueries({ queryKey });
      toast.success(isGlobal ? "Uygulama logosu silindi" : "Salon logosu silindi");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Logo silinemedi")),
  });

  async function selectFile(file: File | null) {
    if (!file) return;
    try {
      await validateLogoFile(file);
      setSelectedFile(file);
    } catch (error) {
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.error(getApiErrorMessage(error, "Logo doğrulanamadı"));
    }
  }

  const title = isGlobal ? "Uygulama markası" : "Salon markası";
  const name = isGlobal ? "iHair" : scope.salonName;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {isGlobal
              ? "Bu logo tüm kullanıcıların giriş ekranında gösterilir."
              : "Şeffaf salon logosu menü başlığında ve sayfa watermark’ında gösterilir."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
          <div className="transparent-grid flex aspect-square items-center justify-center overflow-hidden rounded-2xl border p-4">
            {logoQuery.isLoading && !selectedFile ? (
              <span className="text-muted-foreground text-sm">Yükleniyor…</span>
            ) : (
              <BrandLogo
                src={previewUrl}
                name={name}
                fallback={isGlobal ? "app" : "initial"}
                className="size-full rounded-none bg-transparent text-foreground shadow-none"
                imageClassName="p-1"
              />
            )}
          </div>

          <div className="grid min-w-0 gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`logo-${isGlobal ? "global" : scope.salonId}`}>
                PNG logo
              </Label>
              <Input
                ref={inputRef}
                id={`logo-${isGlobal ? "global" : scope.salonId}`}
                type="file"
                accept="image/png"
                disabled={uploadMutation.isPending || deleteMutation.isPending}
                onChange={(event) =>
                  void selectFile(event.currentTarget.files?.[0] ?? null)
                }
              />
              <p className="text-muted-foreground text-xs">
                En fazla 1 MB, 4096 × 4096 piksel ve saydam arka planlı PNG.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!selectedFile || uploadMutation.isPending}
                onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
              >
                {storedLogoUrl ? <Upload /> : <ImagePlus />}
                {uploadMutation.isPending
                  ? "Yükleniyor…"
                  : storedLogoUrl
                    ? "Logoyu değiştir"
                    : "Logoyu yükle"}
              </Button>
              {selectedFile ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadMutation.isPending}
                  onClick={() => {
                    setSelectedFile(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                >
                  Seçimi kaldır
                </Button>
              ) : null}
              {logoQuery.data ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 />
                  Sil
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`${title} logosu silinsin mi?`}
        description="Logo kalıcı olarak silinir ve ilgili ekranlarda varsayılan görünüm kullanılır."
        confirmText="Logoyu sil"
        destructive
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutateAsync()}
      />
    </>
  );
}
