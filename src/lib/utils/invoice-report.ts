import type { Invoice, InvoiceItem } from "@/lib/types/invoice";
import { roundMoney } from "@/lib/utils/invoice-calculations";

export function normalizeSellerName(name: string): string {
  return name.trim().replace(/\s+/g, " ") || "غير محدد";
}

export function isAhmedSeller(name: string): boolean {
  return normalizeSellerName(name)
    .normalize("NFKD")
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[أإآ]/g, "ا") === "احمد";
}

export interface SellerCommission {
  rate: number;
  amount: number;
}

export function calculateAhmedCommission(totalProfit: number): SellerCommission {
  const rate = totalProfit >= 30_000
    ? 0.3
    : totalProfit >= 20_000
      ? 0.2
      : totalProfit > 10_000
        ? 0.15
        : 0;
  return { rate, amount: roundMoney(Math.max(0, totalProfit) * rate) };
}

export function hasRecordedCustomerName(name: string): boolean {
  const normalized = name.trim().replace(/\s+/g, " ");
  return normalized !== "" && normalized !== "عميل غير مسجل";
}

function itemMeasurements(item: InvoiceItem): string {
  return `${item.lengthCm}×${item.widthCm}×${item.heightCm} - ضغط ${item.densityPressure}`;
}

export function summarizeInvoiceItems(items: InvoiceItem[]): string {
  if (items.length === 0) return "بلا أصناف";
  if (items.length === 1) return itemMeasurements(items[0]);
  const firstItems = items.slice(0, 2).map(itemMeasurements).join("، ");
  const remaining = items.length - 2;
  const suffix = remaining === 1 ? "صنف آخر" : `${remaining} أصناف أخرى`;
  return `${items.length} أصناف: ${firstItems}، + ${suffix}`;
}

export function getInvoiceCustomerOrMeasurements(invoice: Invoice): string {
  return hasRecordedCustomerName(invoice.customerName)
    ? invoice.customerName.trim().replace(/\s+/g, " ")
    : summarizeInvoiceItems(invoice.items);
}

export interface InvoiceReportRow {
  date: string;
  customerOrMeasurements: string;
  sales: number;
  cost: number;
  profit: number;
  sellerName: string;
}

export function createInvoiceReportRows(invoices: Invoice[]): InvoiceReportRow[] {
  return invoices.map((invoice) => ({
    date: invoice.invoiceDate,
    customerOrMeasurements: getInvoiceCustomerOrMeasurements(invoice),
    sales: invoice.invoiceTotal,
    cost: invoice.totalCost,
    profit: invoice.netProfit,
    sellerName: normalizeSellerName(invoice.sellerName),
  }));
}

export interface FinancialTotals {
  totalSales: number;
  totalCost: number;
  totalProfit: number;
}

export interface SellerBreakdown extends FinancialTotals {
  sellerName: string;
  invoiceCount: number;
  profitMargin: number;
}

export function calculateFinancialTotals(invoices: Invoice[]): FinancialTotals {
  return invoices.reduce<FinancialTotals>(
    (totals, invoice) => ({
      totalSales: roundMoney(totals.totalSales + invoice.invoiceTotal),
      totalCost: roundMoney(totals.totalCost + invoice.totalCost),
      totalProfit: roundMoney(totals.totalProfit + invoice.netProfit),
    }),
    { totalSales: 0, totalCost: 0, totalProfit: 0 }
  );
}

export function calculateSellerBreakdown(invoices: Invoice[]): SellerBreakdown[] {
  const sellers = new Map<string, SellerBreakdown>();
  invoices.forEach((invoice) => {
    const sellerName = normalizeSellerName(invoice.sellerName);
    const current = sellers.get(sellerName) ?? {
      sellerName,
      totalSales: 0,
      totalCost: 0,
      totalProfit: 0,
      invoiceCount: 0,
      profitMargin: 0,
    };
    current.totalSales = roundMoney(current.totalSales + invoice.invoiceTotal);
    current.totalCost = roundMoney(current.totalCost + invoice.totalCost);
    current.totalProfit = roundMoney(current.totalProfit + invoice.netProfit);
    current.invoiceCount += 1;
    current.profitMargin = current.totalSales
      ? roundMoney((current.totalProfit / current.totalSales) * 100)
      : 0;
    sellers.set(sellerName, current);
  });
  return [...sellers.values()].sort(
    (left, right) =>
      right.totalSales - left.totalSales || left.sellerName.localeCompare(right.sellerName, "ar")
  );
}
