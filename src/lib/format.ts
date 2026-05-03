import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

export function formatDateTime(iso: string | undefined | null) {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMM yyyy HH:mm", { locale: tr });
  } catch {
    return iso;
  }
}

export function formatMoney(amount: number | string | undefined | null) {
  if (amount === undefined || amount === null || amount === "") return "—";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(n)) return String(amount);
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(n);
}
