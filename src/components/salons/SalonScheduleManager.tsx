import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/api/client";
import {
  createSalonHoliday,
  deleteSalonHoliday,
  getSalonSchedule,
  updateSalonHoliday,
  updateSalonSchedule,
} from "@/api/salonSchedule";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { queryKeys } from "@/lib/queryKeys";
import type {
  SalonHoliday,
  SalonHolidayRequest,
  SalonScheduleDay,
} from "@/types/domain";

const dayLabels = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

const emptyHoliday: SalonHolidayRequest = {
  startDate: "",
  endDate: "",
  description: "",
};

export function SalonScheduleManager({ salonId }: { salonId: number }) {
  const qc = useQueryClient();
  const [days, setDays] = useState<SalonScheduleDay[]>([]);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<SalonHoliday | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState<SalonHoliday | null>(null);
  const [holidayForm, setHolidayForm] =
    useState<SalonHolidayRequest>(emptyHoliday);

  const query = useQuery({
    queryKey: ["salon-schedule", salonId],
    queryFn: () => getSalonSchedule(salonId),
  });

  const effectiveDays = days.length ? days : (query.data?.days ?? []);
  const changeDays = (
    update: (current: SalonScheduleDay[]) => SalonScheduleDay[],
  ) => setDays((current) => update(current.length ? current : (query.data?.days ?? [])));

  const scheduleMutation = useMutation({
    mutationFn: () =>
      updateSalonSchedule(salonId, {
        timeZone: query.data?.timeZone ?? "Europe/Istanbul",
        days: effectiveDays,
      }),
    onSuccess: async () => {
      toast.success("Çalışma saatleri kaydedildi");
      await qc.invalidateQueries({ queryKey: ["salon-schedule", salonId] });
      await qc.invalidateQueries({ queryKey: queryKeys.appointments.weeks });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const holidayMutation = useMutation({
    mutationFn: () =>
      editingHoliday
        ? updateSalonHoliday(salonId, editingHoliday.id, holidayForm)
        : createSalonHoliday(salonId, holidayForm),
    onSuccess: async () => {
      toast.success(editingHoliday ? "Tatil güncellendi" : "Tatil eklendi");
      setHolidayOpen(false);
      setEditingHoliday(null);
      setHolidayForm(emptyHoliday);
      await qc.invalidateQueries({ queryKey: ["salon-schedule", salonId] });
      await qc.invalidateQueries({ queryKey: queryKeys.appointments.weeks });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (holidayId: number) => deleteSalonHoliday(salonId, holidayId),
    onSuccess: async () => {
      toast.success("Tatil silindi");
      setDeletingHoliday(null);
      await qc.invalidateQueries({ queryKey: ["salon-schedule", salonId] });
      await qc.invalidateQueries({ queryKey: queryKeys.appointments.weeks });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (query.isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Haftalık çalışma saatleri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {effectiveDays.map((day, index) => (
            <div
              key={day.dayOfWeek}
              className="grid items-center gap-3 rounded-xl border p-3 sm:grid-cols-[140px_90px_1fr_1fr]"
            >
              <span className="font-medium">{dayLabels[index]}</span>
              <div className="flex items-center gap-2">
                <Switch
                  id={`schedule-${day.dayOfWeek}`}
                  checked={day.open}
                  onCheckedChange={(open) =>
                    changeDays((current) =>
                      current.map((item) =>
                        item.dayOfWeek === day.dayOfWeek ? { ...item, open } : item,
                      ),
                    )
                  }
                />
                <Label htmlFor={`schedule-${day.dayOfWeek}`}>
                  {day.open ? "Açık" : "Kapalı"}
                </Label>
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`opens-${day.dayOfWeek}`}>Açılış</Label>
                <Input
                  id={`opens-${day.dayOfWeek}`}
                  type="time"
                  disabled={!day.open}
                  value={day.opensAt}
                  onChange={(event) =>
                    changeDays((current) =>
                      current.map((item) =>
                        item.dayOfWeek === day.dayOfWeek
                          ? { ...item, opensAt: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`closes-${day.dayOfWeek}`}>Kapanış</Label>
                <Input
                  id={`closes-${day.dayOfWeek}`}
                  type="time"
                  disabled={!day.open}
                  value={day.closesAt}
                  onChange={(event) =>
                    changeDays((current) =>
                      current.map((item) =>
                        item.dayOfWeek === day.dayOfWeek
                          ? { ...item, closesAt: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <Button
              disabled={
                scheduleMutation.isPending ||
                effectiveDays.some(
                  (day) => day.open && (!day.opensAt || !day.closesAt || day.opensAt >= day.closesAt),
                )
              }
              onClick={() => scheduleMutation.mutate()}
            >
              {scheduleMutation.isPending ? "Kaydediliyor…" : "Çalışma saatlerini kaydet"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Tatil ve kapalı tarih aralıkları</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setEditingHoliday(null);
              setHolidayForm(emptyHoliday);
              setHolidayOpen(true);
            }}
          >
            <Plus />
            Tatil ekle
          </Button>
        </CardHeader>
        <CardContent>
          {query.data?.holidays.length ? (
            <div className="divide-y rounded-xl border">
              {query.data.holidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
                >
                  <CalendarOff className="text-muted-foreground size-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {holiday.startDate} – {holiday.endDate}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {holiday.description || "Açıklama yok"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingHoliday(holiday);
                        setHolidayForm({
                          startDate: holiday.startDate,
                          endDate: holiday.endDate,
                          description: holiday.description ?? "",
                        });
                        setHolidayOpen(true);
                      }}
                    >
                      <Pencil />
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeletingHoliday(holiday)}
                    >
                      <Trash2 />
                      Sil
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
              Tanımlı tatil aralığı yok.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={holidayOpen} onOpenChange={setHolidayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? "Tatil aralığını düzenle" : "Tatil aralığı ekle"}
            </DialogTitle>
            <DialogDescription>
              Bu aralık takvimde salon kapalı olarak gösterilir.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              holidayMutation.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="holidayStart">Başlangıç</Label>
                <Input
                  id="holidayStart"
                  type="date"
                  required
                  value={holidayForm.startDate}
                  onChange={(event) =>
                    setHolidayForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="holidayEnd">Bitiş</Label>
                <Input
                  id="holidayEnd"
                  type="date"
                  required
                  min={holidayForm.startDate}
                  value={holidayForm.endDate}
                  onChange={(event) =>
                    setHolidayForm((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="holidayDescription">Açıklama</Label>
              <Input
                id="holidayDescription"
                required
                value={holidayForm.description ?? ""}
                onChange={(event) =>
                  setHolidayForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setHolidayOpen(false)}>
                Vazgeç
              </Button>
              <Button
                type="submit"
                disabled={
                  holidayMutation.isPending ||
                  !holidayForm.startDate ||
                  !holidayForm.endDate ||
                  !holidayForm.description?.trim() ||
                  holidayForm.endDate < holidayForm.startDate
                }
              >
                {holidayMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingHoliday != null}
        onOpenChange={(open) => !open && setDeletingHoliday(null)}
        title="Tatil aralığını sil?"
        description="Salon bu tarih aralığında yeniden açık kabul edilir."
        confirmText="Sil"
        destructive
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          if (deletingHoliday) await deleteMutation.mutateAsync(deletingHoliday.id);
        }}
      />
    </div>
  );
}
