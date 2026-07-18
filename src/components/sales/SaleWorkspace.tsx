import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Building2,
  CreditCard,
  Minus,
  Plus,
  Scissors,
  Search,
  UserPlus,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/api/client";
import { listCustomers } from "@/api/customers";
import { listEmployees } from "@/api/employees";
import { listHairServices } from "@/api/hairServices";
import {
  completeSale,
  createSale,
  getSale,
  listAvailableSaleAppointments,
  updateSale,
} from "@/api/sales";
import { SelectableTile } from "@/components/sales/SelectableTile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
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
      const rawDraft = sessionStorage.getItem(SALE_DRAFT_KEY);
      if (rawDraft) {
        try {
          const draft = JSON.parse(rawDraft) as {
            salonId?: number;
            customerId?: number;
            customerSearch?: string;
            serviceSearch?: string;
            lines?: DraftLine[];
            paymentMethod?: PaymentMethod;
          };
          if (draft.salonId === activeSalonId) {
            setCustomerId(draft.customerId ?? 0);
            setCustomerSearch(draft.customerSearch ?? "");
            setServiceSearch(draft.serviceSearch ?? "");
            setLines(Array.isArray(draft.lines) ? draft.lines : []);
            if (draft.paymentMethod) setPaymentMethod(draft.paymentMethod);
          }
        } catch {
          // Geçersiz taslak, yeni satış akışını engellememelidir.
        }
      }
      if (routeState.customerId) {
        setCustomerId(routeState.customerId);
        void qc.invalidateQueries({ queryKey: ["customers"] });
      }
      sessionStorage.removeItem(SALE_DRAFT_KEY);
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
    queryKey: ["customers", activeSalonId],
    queryFn: () => listCustomers(activeSalonId!),
    enabled: activeSalonId != null,
  });
  const employeesQuery = useQuery({
    queryKey: ["employees", activeSalonId],
    queryFn: () => listEmployees(activeSalonId!),
    enabled: activeSalonId != null,
  });
  const servicesQuery = useQuery({
    queryKey: ["hair-services", activeSalonId],
    queryFn: () => listHairServices(activeSalonId!),
    enabled: activeSalonId != null,
  });
  const saleQuery = useQuery({
    queryKey: ["sale", saleId],
    queryFn: () => getSale(saleId!),
    enabled: saleId != null,
  });
  const appointmentsQuery = useQuery({
    queryKey: ["sales", "available-appointments", activeSalonId],
    queryFn: () => listAvailableSaleAppointments(activeSalonId!),
    enabled: activeSalonId != null && appointmentId != null,
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
              unitPrice: Number(appointment.finalPrice),
              importedFromAppointment: true,
            },
          ]);
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

  const customers = useMemo(() => {
    const query = customerSearch.trim().toLocaleLowerCase("tr-TR");
    return (customersQuery.data ?? [])
      .filter((customer) => customer.active)
      .filter((customer) =>
        `${customer.firstName} ${customer.lastName} ${customer.phone ?? ""}`
          .toLocaleLowerCase("tr-TR")
          .includes(query),
      )
      .slice(0, compact ? 4 : 8);
  }, [compact, customerSearch, customersQuery.data]);
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
        key: `${service.id}-${crypto.randomUUID()}`,
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
    sessionStorage.setItem(
      SALE_DRAFT_KEY,
      JSON.stringify({
        salonId: activeSalonId,
        customerId,
        customerSearch,
        serviceSearch,
        lines,
        paymentMethod,
      }),
    );
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
        sourceAppointmentId:
          appointmentId ?? saleQuery.data?.sourceAppointmentId ?? null,
        items: lines
          .filter((line) => !line.importedFromAppointment)
          .map(({ hairServiceId, employeeId, quantity }, position) => ({
            serviceId: hairServiceId,
            employeeId,
            quantity,
            position:
              (appointmentId ?? saleQuery.data?.sourceAppointmentId) != null
                ? position + 1
                : position,
          })),
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
    onSuccess: async (_, mode) => {
      toast.success(mode === "hold" ? "Satış beklemeye alındı" : "Ödeme tamamlandı");
      setCustomerId(0);
      setLines([]);
      setMessage("");
      workingSaleIdRef.current = saleId ?? null;
      await qc.invalidateQueries({ queryKey: ["sales"] });
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
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
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
                <div className="grid gap-2 sm:grid-cols-2">
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
                <div className="grid gap-2 sm:grid-cols-2">
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

          {lines.length ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-sm">
                    3
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
                      <div>
                        <p className="font-medium">{line.serviceName}</p>
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
                      <div className="grid gap-2 sm:grid-cols-2">
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

        <aside className="sticky top-20 hidden space-y-4 lg:block">
          <SaleSummary
            customerName={
              selectedCustomer
                ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                : undefined
            }
            lines={lines}
            total={total}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            canSubmit={canSubmit}
            pending={saveMutation.isPending}
            onSave={(mode) => saveMutation.mutate(mode)}
          />
        </aside>
      </div>

      <div className="bg-background/95 sticky bottom-0 z-20 -mx-4 border-t p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="mr-auto">
            <p className="text-muted-foreground text-xs">Toplam</p>
            <p className="font-semibold">{formatMoney(total)}</p>
          </div>
          <Button
            variant="outline"
            className="h-11"
            disabled={!canSubmit || saveMutation.isPending}
            onClick={() => saveMutation.mutate("hold")}
          >
            Beklet
          </Button>
          <Button
            className="h-11"
            disabled={!canSubmit || saveMutation.isPending}
            onClick={() => saveMutation.mutate("complete")}
          >
            Öde
          </Button>
        </div>
        <fieldset className="mx-auto mt-2 grid max-w-xl grid-cols-3 gap-2">
          <legend className="sr-only">Ödeme yöntemi</legend>
          {paymentOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={paymentMethod === option.value}
              className={cn(
                "min-h-11 rounded-lg border text-sm font-medium",
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
  total,
  paymentMethod,
  setPaymentMethod,
  canSubmit,
  pending,
  onSave,
}: {
  customerName?: string;
  lines: DraftLine[];
  total: number;
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
          <p className="font-medium">{customerName ?? "Henüz seçilmedi"}</p>
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
        <div className="flex items-end justify-between">
          <span className="text-muted-foreground text-sm">Toplam</span>
          <strong className="text-2xl">{formatMoney(total)}</strong>
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
