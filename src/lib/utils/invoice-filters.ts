import type { Invoice } from "@/lib/types/invoice";
import { hasRecordedCustomerName, normalizeSellerName } from "@/lib/utils/invoice-report";
import { normalizeCustomerName } from "@/lib/utils/customer-accounting";

export interface InvoiceFilters {
  dateFrom: string;
  dateTo: string;
  sellerName: string;
  customerName: string;
  densityPressure: string;
}

export const defaultFilters: InvoiceFilters = { dateFrom: "", dateTo: "", sellerName: "", customerName: "", densityPressure: "" };
export function hasActiveFilters(filters: InvoiceFilters): boolean { return Object.values(filters).some(Boolean); }
export function filterInvoices(invoices: Invoice[], filters: InvoiceFilters): Invoice[] {
  return invoices.filter((invoice) =>
    (!filters.dateFrom || invoice.invoiceDate >= filters.dateFrom) &&
    (!filters.dateTo || invoice.invoiceDate <= filters.dateTo) &&
    (!filters.sellerName || normalizeSellerName(invoice.sellerName) === filters.sellerName) &&
    (!filters.customerName || normalizeCustomerName(invoice.customerName) === filters.customerName) &&
    (!filters.densityPressure || invoice.items.some((item) => String(item.densityPressure) === filters.densityPressure))
  );
}
export function getUniqueSellers(invoices: Invoice[]): string[] { return [...new Set(invoices.map((i) => normalizeSellerName(i.sellerName)))].sort((a,b) => a.localeCompare(b,"ar")); }
export function getUniqueCustomers(invoices: Invoice[]): string[] { return [...new Set(invoices.map((i) => normalizeCustomerName(i.customerName)).filter(hasRecordedCustomerName))].sort((a,b) => a.localeCompare(b,"ar")); }
export function getUniquePressures(invoices: Invoice[]): number[] { return [...new Set(invoices.flatMap((i) => i.items.map((item) => item.densityPressure)))].sort((a,b) => a-b); }

export interface InvoiceStats { totalSales: number; totalCost: number; totalProfit: number; invoiceCount: number; itemCount: number; totalQuantity: number; averageInvoiceValue: number; averageProfitMargin: number; }
export function calculateStats(invoices: Invoice[]): InvoiceStats {
  const totalSales = invoices.reduce((s,i) => s+i.invoiceTotal,0);
  const totalCost = invoices.reduce((s,i) => s+i.totalCost,0);
  const totalProfit = invoices.reduce((s,i) => s+i.netProfit,0);
  const totalQuantity = invoices.reduce((s,i) => s+i.items.reduce((x,item)=>x+item.quantity,0),0);
  const itemCount = invoices.reduce((s,i) => s+i.items.length,0);
  return { totalSales, totalCost, totalProfit, invoiceCount: invoices.length, itemCount, totalQuantity, averageInvoiceValue: invoices.length ? totalSales/invoices.length : 0, averageProfitMargin: totalSales ? totalProfit/totalSales*100 : 0 };
}
