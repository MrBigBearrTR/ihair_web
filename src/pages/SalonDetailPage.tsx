import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { getSalon } from "@/api/salons";
import {
  deleteSetting,
  listSettings,
  upsertSetting,
} from "@/api/salonSettings";
import { getApiErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import type { SettingType } from "@/types/domain";

const settingSchema = z.object({
  settingKey: z.string().min(1, "Anahtar gerekli"),
  settingType: z.enum(["TEXT", "IMAGE_BASE64", "URL", "JSON"]),
  settingValue: z.string().min(1, "Değer gerekli"),
});

type SettingForm = z.infer<typeof settingSchema>;

export function SalonDetailPage() {
  const { salonId } = useParams();
  const id = Number(salonId);
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const salonQuery = useQuery({
    queryKey: ["salon", id],
    queryFn: () => getSalon(id),
    enabled: Number.isFinite(id),
  });

  const settingsQuery = useQuery({
    queryKey: ["salon-settings", id],
    queryFn: () => listSettings(id),
    enabled: Number.isFinite(id),
  });

  const form = useForm<SettingForm>({
    resolver: zodResolver(settingSchema),
    defaultValues: {
      settingKey: "",
      settingType: "TEXT",
      settingValue: "",
    },
  });

  const settingType = form.watch("settingType");

  const saveMutation = useMutation({
    mutationFn: async (values: SettingForm) => {
      const key = values.settingKey.trim().toUpperCase();
      return upsertSetting(id, key, {
        settingType: values.settingType,
        settingValue: values.settingValue,
      });
    },
    onSuccess: async () => {
      toast.success("Ayar kaydedildi");
      setOpen(false);
      setEditingKey(null);
      form.reset({ settingKey: "", settingType: "TEXT", settingValue: "" });
      await qc.invalidateQueries({ queryKey: ["salon-settings", id] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => deleteSetting(id, key),
    onSuccess: async () => {
      toast.success("Ayar silindi");
      setDeletingKey(null);
      await qc.invalidateQueries({ queryKey: ["salon-settings", id] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const rows = useMemo(() => settingsQuery.data ?? [], [settingsQuery.data]);

  async function onPickImage(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result ?? "");
      const base64 = res.includes(",") ? res.split(",")[1] ?? res : res;
      form.setValue("settingValue", base64, { shouldValidate: true });
    };
    reader.readAsDataURL(file);
  }

  if (!Number.isFinite(id)) {
    return <div className="text-sm">Geçersiz salon</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" asChild className="-ml-2 w-fit px-2">
            <Link to="/salons">
              <ArrowLeft />
              Salonlara dön
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {salonQuery.isLoading ? "Yükleniyor…" : salonQuery.data?.name ?? "Salon"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Salon ayarları (LOGO, WORKING_HOURS vb.) key-value olarak yönetilir.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingKey(null);
            form.reset({ settingKey: "", settingType: "TEXT", settingValue: "" });
            setOpen(true);
          }}
        >
          <Plus />
          Yeni ayar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ayarlar</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            isLoading={settingsQuery.isLoading}
            getRowId={(r) => r.settingKey}
            empty={
              <EmptyState
                title="Ayar yok"
                description="Örn. LOGO, ADDRESS, WORKING_HOURS anahtarlarını ekleyebilirsiniz."
              />
            }
            columns={[
              { id: "key", header: "Anahtar", cell: (r) => r.settingKey },
              { id: "type", header: "Tip", cell: (r) => r.settingType },
              {
                id: "value",
                header: "Değer",
                cell: (r) => (
                  <span className="line-clamp-2 max-w-[420px] font-mono text-xs">
                    {r.settingType === "IMAGE_BASE64"
                      ? `${r.settingValue.slice(0, 24)}…`
                      : r.settingValue}
                  </span>
                ),
              },
              {
                id: "actions",
                header: "",
                className: "w-[1%] whitespace-nowrap text-right",
                cell: (r) => (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingKey(r.settingKey);
                        form.reset({
                          settingKey: r.settingKey,
                          settingType: r.settingType as SettingType,
                          settingValue: r.settingValue,
                        });
                        setOpen(true);
                      }}
                    >
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeletingKey(r.settingKey)}
                    >
                      <Trash2 />
                      Sil
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingKey ? "Ayar düzenle" : "Yeni ayar"}</DialogTitle>
            <DialogDescription>
              Anahtarlar büyük harfe normalize edilir (örn. <code>logo</code> →{" "}
              <code>LOGO</code>).
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
          >
            <div className="grid gap-2">
              <Label htmlFor="settingKey">Anahtar</Label>
              <Input
                id="settingKey"
                disabled={Boolean(editingKey)}
                placeholder="LOGO"
                {...form.register("settingKey")}
              />
              {form.formState.errors.settingKey?.message ? (
                <p className="text-destructive text-sm">
                  {form.formState.errors.settingKey.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Tip</Label>
              <Select
                value={form.watch("settingType")}
                onValueChange={(v) =>
                  form.setValue("settingType", v as SettingType, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tip seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">TEXT</SelectItem>
                  <SelectItem value="URL">URL</SelectItem>
                  <SelectItem value="JSON">JSON</SelectItem>
                  <SelectItem value="IMAGE_BASE64">IMAGE_BASE64</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="settingValue">Değer</Label>
              {settingType === "IMAGE_BASE64" ? (
                <div className="grid gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
                  />
                  <Textarea
                    id="settingValue"
                    rows={6}
                    className="font-mono text-xs"
                    {...form.register("settingValue")}
                  />
                </div>
              ) : settingType === "JSON" ? (
                <Textarea
                  id="settingValue"
                  rows={8}
                  className="font-mono text-xs"
                  {...form.register("settingValue")}
                />
              ) : (
                <Textarea id="settingValue" rows={4} {...form.register("settingValue")} />
              )}
              {form.formState.errors.settingValue?.message ? (
                <p className="text-destructive text-sm">
                  {form.formState.errors.settingValue.message}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Vazgeç
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deletingKey)}
        onOpenChange={(o) => !o && setDeletingKey(null)}
        title="Ayarı sil?"
        description="Bu ayar kaydı kalıcı olarak silinir."
        confirmText="Sil"
        destructive
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deletingKey) return;
          await deleteMutation.mutateAsync(deletingKey);
        }}
      />
    </div>
  );
}
