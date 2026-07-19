import { useQuery } from "@tanstack/react-query";

import { getSale } from "@/api/sales";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatMoney } from "@/lib/format";
import { cacheTimes, queryKeys } from "@/lib/queryKeys";
import type { PaymentMethod } from "@/types/domain";

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Nakit",
  CARD: "Kart",
  BANK_TRANSFER: "Havale / EFT",
};

export function SaleDetailDialog({
  saleId,
  onOpenChange,
}: {
  saleId: number | null;
  onOpenChange: (open: boolean) => void;
}) {
  const query = useQuery({
    queryKey: queryKeys.sales.detail(saleId ?? 0),
    queryFn: () => getSale(saleId!),
    enabled: saleId != null,
    staleTime: cacheTimes.detail,
  });
  const sale = query.data;

  return (
    <Dialog open={saleId != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Satış detayı{sale ? ` #${sale.id}` : ""}</DialogTitle>
          <DialogDescription>
            Satışın güncel hizmet ve ödeme bilgileri.
          </DialogDescription>
        </DialogHeader>
        {query.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-32" />
          </div>
        ) : query.isError || !sale ? (
          <p className="text-destructive text-sm">Satış detayı yüklenemedi.</p>
        ) : (
          <div className="space-y-5">
            <dl className="grid gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Müşteri</dt>
                <dd className="font-medium">{sale.customerName || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tarih</dt>
                <dd className="font-medium">
                  {formatDateTime(sale.completedAt ?? sale.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Durum</dt>
                <dd><Badge variant="secondary">{sale.status}</Badge></dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Kaynak randevu</dt>
                <dd className="font-medium">
                  {sale.sourceAppointmentId ? `#${sale.sourceAppointmentId}` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Kampanya</dt>
                <dd className="font-medium">
                  {sale.campaignCode
                    ? `${sale.campaignName || "Kampanya"} (${sale.campaignCode})`
                    : "—"}
                </dd>
              </div>
            </dl>

            <section aria-labelledby="sale-services-title">
              <h3 id="sale-services-title" className="mb-2 font-semibold">
                Hizmetler
              </h3>
              <div className="divide-y rounded-xl border">
                {sale.items.map((item, index) => {
                  const lineTotal = Number(item.lineTotal);
                  const discountShare = Number(item.discountShare);
                  return (
                    <div
                      key={item.id ?? `${item.hairServiceId}-${index}`}
                      className="grid gap-1 p-3 text-sm sm:grid-cols-[1fr_auto] sm:gap-4"
                    >
                      <div>
                        <p className="font-medium">{item.hairServiceName}</p>
                        <p className="text-muted-foreground">{item.employeeName}</p>
                      </div>
                      <div className="space-y-0.5 sm:text-right">
                        <p>
                          {item.quantity} × {formatMoney(item.unitPrice)}
                          <span className="ml-2 font-semibold">
                            {formatMoney(lineTotal)}
                          </span>
                        </p>
                        {discountShare > 0 ? (
                          <p className="text-muted-foreground text-xs">
                            İndirim -{formatMoney(discountShare)} · Net{" "}
                            {formatMoney(item.netLineTotal)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="sale-payments-title">
              <h3 id="sale-payments-title" className="mb-2 font-semibold">
                Ödemeler
              </h3>
              <div className="space-y-2 rounded-xl border p-3 text-sm">
                {sale.payments?.length ? (
                  sale.payments.map((payment, index) => (
                    <div
                      key={`${payment.method}-${index}`}
                      className="flex justify-between gap-3"
                    >
                      <span>{paymentLabels[payment.method] ?? payment.method}</span>
                      <span className="font-medium">{formatMoney(payment.amount)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">Ödeme bilgisi yok.</p>
                )}
              </div>
            </section>

            <div className="space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Brüt toplam</span>
                <span>{formatMoney(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">İndirim</span>
                <span>-{formatMoney(sale.discountAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Net toplam</span>
                <strong className="text-xl">{formatMoney(sale.totalAmount)}</strong>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
