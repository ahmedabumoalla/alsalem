import { format } from "date-fns";
import type { Invoice } from "@/lib/types/invoice";
import {
  calculateFinancialTotals,
  calculateSellerBreakdown,
  createInvoiceReportRows,
} from "@/lib/utils/invoice-report";

export const CSV_REPORT_HEADERS = [
  "التاريخ",
  "العميل / القياسات",
  "سعر البيع",
  "سعر التكلفة",
  "الفائدة",
  "البائع",
] as const;

function escapeCsvField(value: string | number): string {
  const text = String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[,"\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function buildInvoicesCsv(invoices: Invoice[]): string {
  const reportRows = createInvoiceReportRows(invoices).map((row) => [
    row.date,
    row.customerOrMeasurements,
    row.sales.toFixed(2),
    row.cost.toFixed(2),
    row.profit.toFixed(2),
    row.sellerName,
  ]);
  const totals = calculateFinancialTotals(invoices);
  const sellers = calculateSellerBreakdown(invoices);
  const rows: (string | number)[][] = [
    [...CSV_REPORT_HEADERS],
    ...reportRows,
    [],
    ["الإجماليات"],
    ["إجمالي المبيعات", totals.totalSales.toFixed(2)],
    ["إجمالي التكلفة", totals.totalCost.toFixed(2)],
    ["إجمالي الربح", totals.totalProfit.toFixed(2)],
    [],
    ["تفصيل البائعين"],
    ["البائع", "إجمالي المبيعات", "إجمالي التكلفة", "إجمالي الربح"],
    ...sellers.map((seller) => [
      seller.sellerName,
      seller.totalSales.toFixed(2),
      seller.totalCost.toFixed(2),
      seller.totalProfit.toFixed(2),
    ]),
  ];
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\n");
}

export function exportInvoicesToCsv(invoices: Invoice[]): void {
  const blob = new Blob(["\uFEFF" + buildInvoicesCsv(invoices)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `foam-sales-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
