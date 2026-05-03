import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { validateCampaign } from "@/api/campaigns";
import { getApiErrorMessage } from "@/api/client";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/format";

export function CampaignValidatePage() {
  const [code, setCode] = useState("");

  const mutation = useMutation({
    mutationFn: async () => validateCampaign(code.trim()),
    onError: (e) => toast.error(getApiErrorMessage(e, "Kod doğrulanamadı")),
  });

  const result = mutation.data;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kampanya doğrula</h1>
        <p className="text-muted-foreground text-sm">
          Kampanya kodunu girerek geçerlilik ve indirim bilgisini görüntüleyin.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Kod sorgula</CardTitle>
          <CardDescription>
            Bu işlem sadece doğrulama içindir; kullanım sayacını artırmaz.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="code">Kampanya kodu</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Örn. KURUCU50"
            />
          </div>
          <Button
            type="button"
            disabled={!code.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Sorgulanıyor…" : "Doğrula"}
          </Button>

          {result ? (
            <div className="space-y-3">
              <Separator />
              <div className="grid gap-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Durum</span>
                  <Badge variant={result.active ? "secondary" : "outline"}>
                    {result.active ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Ad: </span>
                  <span className="font-medium">{result.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Kod: </span>
                  <span className="font-mono font-medium">{result.code}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tip: </span>
                  <span className="font-medium">{result.discountType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Değer: </span>
                  <span className="font-medium">
                    {result.discountType === "FREE_SESSION"
                      ? "Ücretsiz seans"
                      : String(result.discountValue)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Kullanım: </span>
                  <span className="font-medium">
                    {result.usedCount ?? 0}/{result.maxUsageCount ?? "∞"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Başlangıç: </span>
                  <span className="font-medium">
                    {result.validFrom ? formatDateTime(result.validFrom) : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Bitiş: </span>
                  <span className="font-medium">
                    {result.validTo ? formatDateTime(result.validTo) : "—"}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
