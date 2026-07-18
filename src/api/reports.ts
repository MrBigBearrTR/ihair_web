import { api } from "@/api/client";
import type {
  PaymentMethod,
  RevenueGrouping,
  RevenueReport,
} from "@/types/domain";

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getRevenueReport(params: {
  salonId?: number;
  startDate: string;
  endDate: string;
  employeeId?: number;
  grouping: RevenueGrouping;
}): Promise<RevenueReport> {
  const groupBy = {
    daily: "DAY",
    monthly: "MONTH",
    employee: "EMPLOYEE",
  }[params.grouping];

  const { data } = await api.get<Record<string, unknown>>("/api/reports/revenue", {
    params: {
      salonId: params.salonId,
      from: params.startDate,
      to: params.endDate,
      employeeId: params.employeeId,
      groupBy,
    },
  });
  const summary = (data.summary ?? data.totals ?? data) as Record<string, unknown>;
  const rawGroups = (data.groups ?? data.rows ?? data.breakdown ?? []) as Record<
    string,
    unknown
  >[];
  const paymentSource = data.payments ?? data.paymentBreakdown ?? [];
  const rawPayments: Record<string, unknown>[] = Array.isArray(paymentSource)
    ? (paymentSource as Record<string, unknown>[])
    : Object.entries(paymentSource as Record<string, unknown>).map(
        ([method, amount]) => ({ method, amount }),
      );

  return {
    summary: {
      totalRevenue: number(
        summary.totalRevenue ?? summary.revenue ?? summary.totalAmount,
      ),
      saleCount: number(summary.saleCount ?? summary.salesCount ?? summary.count),
      averageSale: number(
        summary.averageSale ?? summary.averageAmount ?? summary.average,
      ),
      serviceCount: number(
        summary.serviceCount ?? summary.itemCount ?? summary.servicesCount,
      ),
    },
    groups: rawGroups.map((row, index) => ({
      key: String(row.key ?? row.date ?? row.month ?? row.employeeId ?? index),
      label: String(
        row.label ?? row.date ?? row.month ?? row.employeeName ?? "Diğer",
      ),
      revenue: number(row.revenue ?? row.totalRevenue ?? row.amount),
      saleCount: number(row.saleCount ?? row.count),
    })),
    payments: rawPayments.map((row) => ({
      method: String(row.method ?? row.paymentMethod) as PaymentMethod,
      amount: number(row.amount ?? row.totalAmount),
      count: number(row.count ?? row.paymentCount),
    })),
  };
}
