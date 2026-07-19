import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Building2,
  CreditCard,
  Minus,
  Plus,
  Scissors,
  Search,
  Tag,
  UserPlus,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { getApiErrorMessage } from "@/api/client";
import { listCustomers } from "@/api/customers";
import { listEmployees } from "@/api/employees";
import { listHairServices } from "@/api/hairServices";
import {
  completeSale,
  createSale,
  getSale,
  listAvailableSaleAppointments,
  quoteSale,
  updateSale,
} from "@/api/sales";
import { SelectableTile } from "@/components/sales/SelectableTile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/hooks/useDebounce";
import { createClientId } from "@/lib/clientId";
import { formatMoney } from "@/lib/format";
import { cacheTimes, queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type {
  HairService,
  PaymentMethod,
  SaleRequest,
} from "@/types/domain";

type DraftLine = {
  key: string;
  hairServiceId: number;
  serviceName: string;
  employeeId: number;
  quantity: number;
  unitPrice: number;
  importedFromAppointment?: boolean;
};

const paymentOptions = [
  { value: "CASH" as const, label: "Nakit", icon: Banknote },
  { value: "CARD" as const, label: "Kart", icon: CreditCard },
  { value: "BANK_TRANSFER" as const, label: "Havale / EFT", icon: Building2 },
];

const SALE_DRAFT_KEY = "ihair-sale-draft";
const draftLineSchema = z.object({
  key: z.string().min(1),
  hairServiceId: z.number().int().positive(),
  serviceName: z.string().min(1),
  employeeId: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().finite().nonnegative(),
  importedFromAppointment: z.boolean().optional(),
});
const saleDraftSchema = z.object({
  salonId: z.number().int().positive(),
  customerId: z.number().int().nonnegative().optional(),
  customerSearch: z.string().optional(),
  serviceSearch: z.string().optional(),
  lines: z.array(z.unknown()).optional(),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER"]).optional(),
  campaignCode: z.string().optional(),
  campaignRemoved: z.boolean().optional(),
});

function readSaleDraft() {
  try {
    const rawDraft = sessionStorage.getItem(SALE_DRAFT_KEY);
    if (!rawDraft) return null;

    const parsedDraft = saleDraftSchema.safeParse(JSON.parse(rawDraft));
    if (!parsedDraft.success) return null;

    return {
      ...parsedDraft.data,
      lines: (parsedDraft.data.lines ?? []).flatMap((line) => {
        const parsedLine = draftLineSchema.safeParse(line);
        return parsedLine.success ? [parsedLine.data] : [];
      }),
    };
  } catch {
    return null;
  }
}

function clearSaleDraft() {
  try {
    sessionStorage.removeItem(SALE_DRAFT_KEY);
  } catch {
    // Storage may be unavailable in Safari private mode.
  }
}

export function SaleWorkspace({
  saleId,
  appointmentId,
  compact = false,
  onFinished,
}: {
  saleId?: number;
  appointmentId?: number;
  compact?: boolean;
  onFinished?: () => void;
}) {
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const activeSalonId = useAuthStore((state) => state.activeSalonId);
  const role = useAuthStore((state) => state.role);
  const signedInEmployeeId = useAuthStore((state) => state.employeeId);
  const [customerId, setCustomerId] = useState(0);
  const [customerSearch, setCustomerSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [campaignInput, setCampaignInput] = useState("");
  const [campaignOverride, setCampaignOverride] = useState<string | undefined>();
  const [campaignTouched, setCampaignTouched] = useState(false);
  const [message, setMessage] = useState("");
  const workingSaleIdRef = useRef<number | null>(saleId ?? null);

  useEffect(() => {
    workingSaleIdRef.current = saleId ?? null;
  }, [saleId]);

  useEffect(() => {
    const routeState = location.state as
      | { resumeSale?: boolean; customerId?: number }
      | null;
    if (!routeState?.resumeSale) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const draft = readSaleDraft();
      if (draft?.salonId === activeSalonId) {
        setCustomerId(draft.customerId ?? 0);
        setCustomerSearch(draft.customerSearch ?? "");
        setServiceSearch(draft.serviceSearch ?? "");
        setLines(draft.lines);
        if (draft.paymentMethod) setPaymentMethod(draft.paymentMethod);
        setCampaignInput(draft.campaignCode ?? "");
        setCampaignOverride(
          draft.campaignRemoved ? "" : draft.campaignCode?.trim().toUpperCase(),
        );
      }
      if (routeState.customerId) {
        setCustomerId(routeState.customerId);
        void qc.invalidateQueries({
          queryKey: queryKeys.reference.customers(activeSalonId ?? undefined),
        });
      }
      clearSaleDraft();
      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeSalonId,
    location.pathname,
    location.search,
    location.state,
    navigate,
    qc,
  ]);

  const customersQuery = useQuery({
    queryKey: queryKeys.reference.customers(activeSalonId ?? undefined),
    queryFn: () => listCustomers(activeSalonId!),
    enabled: activeSalonId != null,
    staleTime: cacheTimes.reference,
  });
  const employeesQuery = useQuery({
    queryKey: queryKeys.reference.employees(activeSalonId ?? undefined),
    queryFn: () => listEmployees(activeSalonId!),
    enabled: activeSalonId != null,
    staleTime: cacheTimes.reference,
  });
  const servicesQuery = useQuery({
    queryKey: queryKeys.reference.hairServices(activeSalonId ?? undefined),
    queryFn: () => listHairServices(activeSalonId!),
    enabled: activeSalonId != null,
    staleTime: cacheTimes.reference,
  });
  const saleQuery = useQuery({
    queryKey: queryKeys.sales.detail(saleId ?? 0),
    queryFn: () => getSale(saleId!),
    enabled: saleId != null,
    staleTime: cacheTimes.detail,
  });
  const appointmentsQuery = useQuery({
    queryKey: queryKeys.sales.availableAppointments(activeSalonId ?? 0),
    queryFn: () => listAvailableSaleAppointments(activeSalonId!),
    enabled: activeSalonId != null && appointmentId != null,
    staleTime: cacheTimes.transactionList,
  });

  const sourceKey = saleQuery.data
    ? `sale-${saleQuery.data.id}`
    : appointmentId && appointmentsQuery.data
      ? `appointment-${appointmentId}`
      : "";

  useEffect(() => {
    if (!sourceKey) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;

      if (saleQuery.data) {
        setCustomerId(saleQuery.data.customerId);
        setLines(
          saleQuery.data.items.map((item, index) => ({
            key: `${item.id ?? item.hairServiceId}-${index}`,
            hairServiceId: item.hairServiceId,
            serviceName: item.hairServiceName,
            employeeId: item.employeeId,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            importedFromAppointment:
              saleQuery.data.sourceAppointmentId != null && index === 0,
          })),
        );
        setCampaignInput(saleQuery.data.campaignCode ?? "");
        setCampaignOverride(
          saleQuery.data.campaignCode ??
            (saleQuery.data.sourceAppointmentId != null ? "" : undefined),
        );
        setCampaignTouched(false);
      } else {
        const appointment = appointmentsQuery.data?.find(
          (item) => item.id === appointmentId,
        );
        if (appointment) {
          setCustomerId(appointment.customerId);
          setLines([
            {
              key: `appointment-${appointment.id}`,
              hairServiceId: appointment.hairServiceId,
              serviceName: appointment.hairServiceName,
              employeeId: appointment.employeeId,
              quantity: 1,
              unitPrice: Number(
                appointment.campaignCode
                  ? appointment.hairServicePrice
                  : appointment.finalPrice,
              ),
              importedFromAppointment: true,
            },
          ]);
          setCampaignInput(appointment.campaignCode ?? "");
          setCampaignOverride(undefined);
          setCampaignTouched(false);
          setMessage("Randevu bilgileri satışa eklendi.");
        } else {
          setMessage(
            "Randevu satışa uygun değil veya daha önce satışa bağlanmış.",
          );
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [appointmentId, appointmentsQuery.data, saleQuery.data, sourceKey]);

  const debouncedCustomerSearch = useDebounce(customerSearch, 250);
  const debouncedCampaignInput = useDebounce(campaignInput, 400);
  const customers = useMemo(() => {
    const query = debouncedCustomerSearch.trim().toLocaleLowerCase("tr-TR");
    return (customersQuery.data ?? [])
      .filter((customer) => customer.active)
      .filter((customer) =>
        `${customer.firstName} ${customer.lastName} ${customer.phone ?? ""}`
          .toLocaleLowerCase("tr-TR")
          .includes(query),
      )
      .slice(0, compact ? 4 : 8);
  }, [compact, debouncedCustomerSearch, customersQuery.data]);
  const employees = (employeesQuery.data ?? []).filter((employee) => employee.active);
  const services = useMemo(() => {
    const query = serviceSearch.trim().toLocaleLowerCase("tr-TR");
    return (servicesQuery.data ?? [])
      .filter((service) => service.active)
      .filter((service) =>
        `${service.name} ${service.description ?? ""}`
          .toLocaleLowerCase("tr-TR")
          .includes(query),
      );
  }, [serviceSearch, servicesQuery.data]);
  const total = lines.reduce(
    (sum, line) => sum + Number(line.unitPrice ?? 0) * line.quantity,
    0,
  );
  const selectedCustomer = customersQuery.data?.find(
    (customer) => customer.id === customerId,
  );
  const canSubmit =
    activeSalonId != null &&
    customerId > 0 &&
    lines.length > 0 &&
    lines.every((line) => line.employeeId > 0 && line.quantity > 0);

  const effectiveCampaignCode = campaignTouched
    ? debouncedCampaignInput.trim().toUpperCase()
    : campaignOverride;
  const campaignDebouncing =
    campaignTouched &&
    campaignInput.trim().toUpperCase() !== effectiveCampaignCode;

  const sourceAppointmentId =
    appointmentId ?? saleQuery.data?.sourceAppointmentId ?? null;
  const saleItems = useMemo(
    () =>
      lines
        .filter((line) => !line.importedFromAppointment)
        .map(({ hairServiceId, employeeId, quantity }, position) => ({
          serviceId: hairServiceId,
          employeeId,
          quantity,
          position: sourceAppointmentId != null ? position + 1 : position,
        })),
    [lines, sourceAppointmentId],
  );
  const quoteRequest = useMemo<SaleRequest | null>(() => {
    if (!activeSalonId || !canSubmit) return null;
    return {
      salonId: activeSalonId,
      customerId,
      sourceAppointmentId,
      currentSaleId: saleId ?? undefined,
      campaignCode: effectiveCampaignCode,
      items: saleItems,
    };
  }, [
    activeSalonId,
    canSubmit,
    customerId,
    effectiveCampaignCode,
    saleId,
    saleItems,
    sourceAppointmentId,
  ]);
  const quoteQuery = useQuery({
    queryKey: ["sales", "quote", quoteRequest],
    queryFn: () => quoteSale(quoteRequest!),
    enabled: quoteRequest != null && (!saleId || saleQuery.isSuccess),
    staleTime: 0,
    retry: false,
  });
  const quote = quoteQuery.data;
  const quotedSubtotal = Number(quote?.subtotal ?? total);
  const quotedDiscount = Number(quote?.discountAmount ?? 0);
  const quotedTotal = Number(quote?.totalAmount ?? total);
  const canSave =
    canSubmit &&
    quoteQuery.isSuccess &&
    !quoteQuery.isFetching &&
    !campaignDebouncing;

  function addService(service: HairService) {
    const defaultEmployee =
      role === "EMPLOYEE" &&
      signedInEmployeeId &&
      employees.some((employee) => employee.id === signedInEmployeeId)
        ? signedInEmployeeId
        : 0;
    setLines((current) => [
      ...current,
      {
        key: `${service.id}-${createClientId()}`,
        hairServiceId: service.id,
        serviceName: service.name,
        employeeId: defaultEmployee,
        quantity: 1,
        unitPrice: Number(service.price),
      },
    ]);
    setMessage(`${service.name} eklendi.`);
  }

  function createCustomerForSale() {
    if (!activeSalonId) return;
    try {
      sessionStorage.setItem(
        SALE_DRAFT_KEY,
        JSON.stringify({
          salonId: activeSalonId,
          customerId,
          customerSearch,
          serviceSearch,
          lines,
          paymentMethod,
          campaignCode: effectiveCampaignCode || undefined,
          campaignRemoved: effectiveCampaignCode === "",
        }),
      );
    } catch {
      toast.warning("Satış taslağı bu tarayıcıda saklanamadı.");
    }
    navigate("/customers", {
      state: { createForSale: true, salonId: activeSalonId },
    });
  }

  const saveMutation = useMutation({
    mutationFn: async (mode: "hold" | "complete") => {
      if (!activeSalonId || !canSubmit) {
        throw new Error("Müşteri, hizmet ve çalışan seçimlerini tamamlayın.");
      }
      const body: SaleRequest = {
        salonId: activeSalonId,
        customerId,
        sourceAppointmentId,
        currentSaleId: saleId ?? workingSaleIdRef.current,
        campaignCode: effectiveCampaignCode,
        items: saleItems,
      };
      const workingSaleId = saleId ?? workingSaleIdRef.current;
      const sale = workingSaleId
        ? await updateSale(workingSaleId, body)
        : await createSale(body);
      workingSaleIdRef.current = sale.id;
      if (mode === "hold") return sale;
      return completeSale(sale.id, {
        payments: [{ method: paymentMethod, amount: Number(sale.totalAmount) }],
      });
    },
    onSuccess: async (sale, mode) => {
      toast.success(mode === "hold" ? "Satış beklemeye alındı" : "Ödeme tamamlandı");
      setCustomerId(0);
      setLines([]);
      setCampaignInput("");
      setCampaignOverride(undefined);
      setCampaignTouched(false);
      setMessage("");
      workingSaleIdRef.current = saleId ?? null;
      qc.setQueryData(queryKeys.sales.detail(sale.id), sale);
      await Promise.all([
        qc.invalidateQueries({
          queryKey: queryKeys.sales.lists(activeSalonId ?? undefined),
        }),
        qc.invalidateQueries({
          queryKey: queryKeys.sales.availableAppointments(activeSalonId ?? 0),
        }),
        qc.invalidateQueries({
          queryKey: queryKeys.appointments.lists(activeSalonId ?? undefined),
        }),
        qc.invalidateQueries({ queryKey: queryKeys.appointments.weeks }),
        qc.invalidateQueries({ queryKey: queryKeys.campaigns.all }),
        qc.invalidateQueries({ queryKey: queryKeys.revenue.all }),
      ]);
      onFinished?.();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (activeSalonId == null) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 text-center">
          <WalletCards className="text-primary size-10" />
          <div>
            <h2 className="font-semibold">Satış için bir salon seçin</h2>
            <p className="text-muted-foreground mt-1 max-w-md text-sm">
              “Tüm salonlar” görünümünde satış başlatılamaz. Üst alandan işlem
              yapılacak salonu seçin.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-4" aria-label="Yeni satış">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-sm">
                  1
                </span>
                Müşteri seçin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  autoFocus={!compact}
                  className="h-11 pl-9"
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  placeholder="Ad veya telefonla ara"
                  aria-label="Müşteri ara"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full sm:w-auto"
                onClick={createCustomerForSale}
              >
                <UserPlus />
                Yeni müşteri ekle
              </Button>
              <fieldset>
                <legend className="sr-only">Müşteriler</legend>
                <div className="grid gap-2 md:grid-cols-2">
                  {customers.map((customer) => (
                    <SelectableTile
                      key={customer.id}
                      checked={customer.id === customerId}
                      icon={UserRound}
                      title={`${customer.firstName} ${customer.lastName}`}
                      description={customer.phone ?? "Telefon bilgisi yok"}
                      onSelect={() => setCustomerId(customer.id)}
                    />
                  ))}
                </div>
              </fieldset>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-sm">
                  2
                </span>
                Hizmet ekleyin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  className="h-11 pl-9"
                  value={serviceSearch}
                  onChange={(event) => setServiceSearch(event.target.value)}
                  placeholder="Hizmet adına göre ara"
                  aria-label="Hizmet ara"
                />
              </div>
              {services.length ? (
                <div className="grid gap-2 md:grid-cols-2">
                {services.map((service) => (
                  <SelectableTile
                    key={service.id}
                    checked={lines.some(
                      (line) => line.hairServiceId === service.id,
                    )}
                    disabled={
                      !customerId ||
                      lines.some((line) => line.hairServiceId === service.id)
                    }
                    icon={Scissors}
                    selectionRole="checkbox"
                    title={service.name}
                    description={
                      service.durationMinutes
                        ? `${service.durationMinutes} dakika`
                        : undefined
                    }
                    trailing={
                      <span className="text-primary text-sm font-semibold">
                        {formatMoney(service.price)}
                      </span>
                    }
                    onSelect={() => addService(service)}
                  />
                ))}
                </div>
              ) : (
                <p className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
                  Aramanızla eşleşen hizmet bulunamadı.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-sm">
                  3
                </span>
                Kampanya
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="saleCampaignCode">Kampanya kodu</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Tag className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="saleCampaignCode"
                      className="h-11 pl-9 font-mono uppercase"
                      value={campaignInput}
                      onChange={(event) => {
                        setCampaignInput(event.target.value);
                        setCampaignTouched(true);
                      }}
                      placeholder={
                        sourceAppointmentId
                          ? "Boşsa randevu kampanyası kullanılır"
                          : "Kampanya kodu girin"
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    disabled={!canSubmit || !campaignInput.trim()}
                    onClick={() => {
                      setCampaignOverride(campaignInput.trim().toUpperCase());
                      setCampaignTouched(false);
                    }}
                  >
                    Uygula
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11"
                    disabled={!canSubmit}
                    onClick={() => {
                      setCampaignInput("");
                      setCampaignOverride("");
                      setCampaignTouched(false);
                    }}
                  >
                    Kaldır
                  </Button>
                </div>
              </div>
              {campaignDebouncing || quoteQuery.isFetching ? (
                <p className="text-muted-foreground text-sm">Kampanya doğrulanıyor…</p>
              ) : quoteQuery.isError ? (
                <p className="text-destructive text-sm">
                  {getApiErrorMessage(quoteQuery.error, "Kampanya veya satış bilgileri doğrulanamadı.")}
                </p>
              ) : quote ? (
                <div className="bg-muted/40 rounded-xl border p-3 text-sm">
                  {quote.campaignCode ? (
                    <>
                      <p className="font-medium">
                        {quote.campaignName || "Kampanya"}{" "}
                        <span className="font-mono">({quote.campaignCode})</span>
                      </p>
                      <p className="text-muted-foreground mt-1">
                        {quote.inheritedFromAppointment
                          ? "Randevudan devralındı."
                          : "Satışa uygulandı."}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Kampanya uygulanmıyor.</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Kampanyayı doğrulamak için müşteri, hizmet ve çalışan seçimlerini tamamlayın.
                </p>
              )}
            </CardContent>
          </Card>

          {lines.length ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-sm">
                    4
                  </span>
                  Satış ayrıntıları
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lines.map((line) => (
                  <div
                    key={line.key}
                    className="bg-muted/40 space-y-3 rounded-xl border p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-medium">{line.serviceName}</p>
                        <p className="text-muted-foreground text-sm">
                          {formatMoney(line.unitPrice)} / adet
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`${line.serviceName} hizmetini kaldır`}
                        onClick={() =>
                          setLines((current) =>
                            current.filter((item) => item.key !== line.key),
                          )
                        }
                      >
                        <X />
                      </Button>
                    </div>
                    <div className="flex min-h-11 items-center gap-2">
                      <span className="text-muted-foreground mr-auto text-sm">Adet</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Adedi azalt"
                        onClick={() =>
                          setLines((current) =>
                            current.map((item) =>
                              item.key === line.key
                                ? { ...item, quantity: Math.max(1, item.quantity - 1) }
                                : item,
                            ),
                          )
                        }
                      >
                        <Minus />
                      </Button>
                      <span className="w-8 text-center font-semibold">{line.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Adedi artır"
                        onClick={() =>
                          setLines((current) =>
                            current.map((item) =>
                              item.key === line.key
                                ? { ...item, quantity: item.quantity + 1 }
                                : item,
                            ),
                          )
                        }
                      >
                        <Plus />
                      </Button>
                    </div>
                    <fieldset>
                      <legend className="mb-2 text-sm font-medium">
                        Hizmeti veren çalışan
                      </legend>
                      <div className="grid gap-2 md:grid-cols-2">
                        {employees.map((employee) => (
                          <SelectableTile
                            key={employee.id}
                            checked={line.employeeId === employee.id}
                            icon={UserRound}
                            title={`${employee.firstName} ${employee.lastName}`}
                            onSelect={() =>
                              setLines((current) =>
                                current.map((item) =>
                                  item.key === line.key
                                    ? { ...item, employeeId: employee.id }
                                    : item,
                                ),
                              )
                            }
                          />
                        ))}
                      </div>
                    </fieldset>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="sticky top-20 hidden space-y-4 xl:block">
          <SaleSummary
            customerName={
              selectedCustomer
                ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                : undefined
            }
            lines={lines}
            subtotal={quotedSubtotal}
            discountAmount={quotedDiscount}
            total={quotedTotal}
            campaignName={quote?.campaignName ?? undefined}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            canSubmit={canSave}
            pending={saveMutation.isPending}
            onSave={(mode) => saveMutation.mutate(mode)}
          />
        </aside>
      </div>

      <div className="bg-background/95 sticky bottom-0 z-20 -mx-4 border-t px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:-mx-6 xl:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-2 sm:gap-3">
          <div className="mr-auto min-w-0">
            <p className="text-muted-foreground text-xs">Toplam</p>
            <p className="truncate font-semibold">{formatMoney(quotedTotal)}</p>
          </div>
          <Button
            variant="outline"
            className="h-11 shrink-0"
            disabled={!canSave || saveMutation.isPending}
            onClick={() => saveMutation.mutate("hold")}
          >
            Beklet
          </Button>
          <Button
            className="h-11 shrink-0"
            disabled={!canSave || saveMutation.isPending}
            onClick={() => saveMutation.mutate("complete")}
          >
            Öde
          </Button>
        </div>
        <fieldset className="mx-auto mt-2 grid max-w-2xl grid-cols-3 gap-2">
          <legend className="sr-only">Ödeme yöntemi</legend>
          {paymentOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={paymentMethod === option.value}
              className={cn(
                "min-h-11 min-w-0 rounded-lg border px-1 text-xs font-medium sm:text-sm",
                paymentMethod === option.value && "border-primary bg-primary/10",
              )}
              onClick={() => setPaymentMethod(option.value)}
            >
              {option.label}
            </button>
          ))}
        </fieldset>
      </div>
      <p className="sr-only" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

function SaleSummary({
  customerName,
  lines,
  subtotal,
  discountAmount,
  total,
  campaignName,
  paymentMethod,
  setPaymentMethod,
  canSubmit,
  pending,
  onSave,
}: {
  customerName?: string;
  lines: DraftLine[];
  subtotal: number;
  discountAmount: number;
  total: number;
  campaignName?: string;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  canSubmit: boolean;
  pending: boolean;
  onSave: (mode: "hold" | "complete") => void;
}) {
  return (
    <Card className="shadow-lg shadow-primary/5">
      <CardHeader>
        <CardTitle>Satış özeti</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p className="text-muted-foreground">Müşteri</p>
          <p className="break-words font-medium">{customerName ?? "Henüz seçilmedi"}</p>
        </div>
        <div className="space-y-2 border-y py-3">
          {lines.length ? (
            lines.map((line) => (
              <div key={line.key} className="flex justify-between gap-2 text-sm">
                <span className="truncate">
                  {line.serviceName} × {line.quantity}
                </span>
                <span>{formatMoney(Number(line.unitPrice) * line.quantity)}</span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">Hizmet eklenmedi.</p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Brüt toplam</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          {discountAmount > 0 ? (
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                İndirim{campaignName ? ` · ${campaignName}` : ""}
              </span>
              <span className="text-success">-{formatMoney(discountAmount)}</span>
            </div>
          ) : null}
          <div className="flex items-end justify-between border-t pt-3">
            <span className="text-muted-foreground text-sm">Net toplam</span>
            <strong className="text-2xl">{formatMoney(total)}</strong>
          </div>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Ödeme yöntemi</legend>
          <div className="space-y-2">
            {paymentOptions.map((option) => (
              <SelectableTile
                key={option.value}
                checked={paymentMethod === option.value}
                icon={option.icon}
                title={option.label}
                onSelect={() => setPaymentMethod(option.value)}
              />
            ))}
          </div>
        </fieldset>
        <Button
          variant="outline"
          className="h-11 w-full"
          disabled={!canSubmit || pending}
          onClick={() => onSave("hold")}
        >
          Beklemeye al
        </Button>
        <Button
          className="h-12 w-full"
          disabled={!canSubmit || pending}
          onClick={() => onSave("complete")}
        >
          {pending ? "Kaydediliyor…" : "Ödemeyi tamamla"}
        </Button>
      </CardContent>
    </Card>
  );
}
