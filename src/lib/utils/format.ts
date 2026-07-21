import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import type { PaymentMethod, PaymentStatus } from "@/lib/types/invoice";

export const EMPTY_DISPLAY = "—";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(amount: number, decimals = 2): string {
  return new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMMM yyyy", { locale: arSA });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "yyyy/MM/dd", { locale: arSA });
  } catch {
    return dateStr;
  }
}

export function formatPaymentMethod(method?: PaymentMethod): string {
  if (!method) return EMPTY_DISPLAY;
  const labels: Record<PaymentMethod, string> = {
    cash: "نقدي",
    bank_transfer: "تحويل بنكي",
  };
  return labels[method];
}

export function formatPaymentStatus(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    paid: "مدفوع بالكامل",
    partial: "مدفوع جزئيًا",
    deferred: "آجل بالكامل",
  };
  return labels[status];
}

export function formatWeight(weightKg?: number): string {
  if (weightKg == null || weightKg <= 0) return EMPTY_DISPLAY;
  return `${formatNumber(weightKg, 1)} كجم`;
}

export function formatDimensions(
  lengthCm: number,
  widthCm: number,
  thicknessCm: number
): string {
  return `${lengthCm} × ${widthCm} × ${thicknessCm} سم`;
}

export function formatDimensionsLabel(
  lengthCm: number,
  widthCm: number,
  thicknessCm: number
): string {
  return `المقاس: ${formatDimensions(lengthCm, widthCm, thicknessCm)}`;
}

export function formatPercent(value: number): string {
  return `${formatNumber(value, 1)}%`;
}

export function formatInvoiceCount(count: number): string {
  return `${formatNumber(count, 0)} فاتورة ضمن النتائج`;
}
