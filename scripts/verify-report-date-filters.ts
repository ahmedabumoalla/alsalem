import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strFromU8, unzipSync } from "fflate";
import type { Invoice } from "../src/lib/types/invoice";
import {
  calculateStats,
  createDefaultInvoiceFilters,
  filterInvoices,
} from "../src/lib/utils/invoice-filters";
import { calculateSellerBreakdown } from "../src/lib/utils/invoice-report";
import {
  detectReportDatePreset,
  getReportDateRange,
  SAUDI_TIME_ZONE,
} from "../src/lib/utils/report-date-range";
import { buildInvoicesWorkbook } from "../src/lib/utils/excel-export";
import {
  buildPdfReportFileName,
  createPdfTableRows,
} from "../src/lib/utils/pdf-export";

const marchFirst = new Date("2026-03-01T09:00:00.000Z");
assert.deepEqual(getReportDateRange("today", marchFirst), {
  dateFrom: "2026-03-01",
  dateTo: "2026-03-01",
});
assert.deepEqual(getReportDateRange("yesterday", marchFirst), {
  dateFrom: "2026-02-28",
  dateTo: "2026-02-28",
});
assert.deepEqual(getReportDateRange("last7Days", marchFirst), {
  dateFrom: "2026-02-23",
  dateTo: "2026-03-01",
});
assert.deepEqual(getReportDateRange("thisMonth", marchFirst), {
  dateFrom: "2026-03-01",
  dateTo: "2026-03-01",
});
assert.deepEqual(getReportDateRange("lastMonth", marchFirst), {
  dateFrom: "2026-02-01",
  dateTo: "2026-02-28",
});
assert.deepEqual(getReportDateRange("allTime", marchFirst), {
  dateFrom: "",
  dateTo: "",
});

const january = new Date("2026-01-03T09:00:00.000Z");
assert.deepEqual(getReportDateRange("last7Days", january), {
  dateFrom: "2025-12-28",
  dateTo: "2026-01-03",
});
assert.deepEqual(getReportDateRange("lastMonth", january), {
  dateFrom: "2025-12-01",
  dateTo: "2025-12-31",
});

// 21:30 UTC is already the next local day in Saudi Arabia.
const saudiMidnightBoundary = new Date("2026-01-31T21:30:00.000Z");
assert.equal(SAUDI_TIME_ZONE, "Asia/Riyadh");
assert.deepEqual(getReportDateRange("today", saudiMidnightBoundary), {
  dateFrom: "2026-02-01",
  dateTo: "2026-02-01",
});
assert.deepEqual(getReportDateRange("yesterday", saudiMidnightBoundary), {
  dateFrom: "2026-01-31",
  dateTo: "2026-01-31",
});

const customRange = { dateFrom: "2026-01-04", dateTo: "2026-01-11" };
assert.equal(detectReportDatePreset(customRange, january), "custom");
assert.equal(
  detectReportDatePreset(getReportDateRange("allTime", january), january),
  "allTime",
);
const defaults = createDefaultInvoiceFilters(january);
assert.deepEqual(
  { dateFrom: defaults.dateFrom, dateTo: defaults.dateTo },
  { dateFrom: "2026-01-01", dateTo: "2026-01-03" },
);
assert.equal(detectReportDatePreset(defaults, january), "thisMonth");

function invoice(
  id: string,
  invoiceDate: string,
  sellerName: string,
  customerName: string,
  total: number,
): Invoice {
  return {
    schemaVersion: 3,
    id,
    invoiceNumber: id,
    invoiceDate,
    deliveryDate: invoiceDate,
    sellerName,
    customerName,
    items: [{
      id: `${id}-item`,
      lengthCm: 200,
      widthCm: 100,
      heightCm: 20,
      densityPressure: 8,
      quantity: 1,
      unitSalePrice: total,
      unitCost: total / 2,
      costSource: "auto",
      productSubtotal: total,
      totalCost: total / 2,
      netProfit: total / 2,
    }],
    deliveryFee: 0,
    productSubtotal: total,
    invoiceTotal: total,
    totalCost: total / 2,
    netProfit: total / 2,
    profitMargin: 50,
    createdAt: `${invoiceDate}T08:00:00.000Z`,
    updatedAt: `${invoiceDate}T08:00:00.000Z`,
  };
}

const invoices = [
  invoice("JAN-15", "2026-01-15", "أحمد", "عميل عادي", 100),
  invoice("JAN-10", "2026-01-10", "أحمد", "العميل الهدف", 200),
  invoice("DEC-20", "2025-12-20", "سارة", "العميل الهدف", 300),
  invoice("JAN-20", "2026-01-20", "سارة", "عميل لاحق", 400),
];
const januaryFifteenth = new Date("2026-01-15T09:00:00.000Z");
const januaryFilters = createDefaultInvoiceFilters(januaryFifteenth);
const monthInvoices = filterInvoices(invoices, januaryFilters);
assert.deepEqual(monthInvoices.map(({ id }) => id), ["JAN-15", "JAN-10"]);
assert.deepEqual(calculateStats(monthInvoices), {
  totalSales: 300,
  totalCost: 150,
  totalProfit: 150,
  invoiceCount: 2,
  itemCount: 2,
  totalQuantity: 2,
  averageInvoiceValue: 150,
  averageProfitMargin: 50,
});
assert.deepEqual(calculateSellerBreakdown(monthInvoices).map((seller) => ({
  seller: seller.sellerName,
  sales: seller.totalSales,
})), [{ seller: "أحمد", sales: 300 }]);

const searchedInvoices = filterInvoices(invoices, {
  ...januaryFilters,
  query: "الهدف",
});
assert.deepEqual(searchedInvoices.map(({ id }) => id), ["JAN-10"]);
const customInvoices = filterInvoices(invoices, {
  ...januaryFilters,
  ...customRange,
});
assert.deepEqual(customInvoices.map(({ id }) => id), ["JAN-10"]);
const allInvoices = filterInvoices(invoices, {
  ...januaryFilters,
  ...getReportDateRange("allTime", januaryFifteenth),
});
assert.equal(allInvoices.length, 4);
assert.equal(calculateStats(allInvoices).totalSales, 1_000);
assert.equal(calculateSellerBreakdown(allInvoices).length, 2);

const workbookFiles = unzipSync(buildInvoicesWorkbook(monthInvoices));
const excelInvoices = strFromU8(workbookFiles["xl/worksheets/sheet1.xml"]);
const excelSellers = strFromU8(workbookFiles["xl/worksheets/sheet2.xml"]);
assert.ok(excelInvoices.includes("JAN-15") && excelInvoices.includes("JAN-10"));
assert.ok(!excelInvoices.includes("DEC-20") && !excelInvoices.includes("JAN-20"));
assert.ok(excelSellers.includes("أحمد") && !excelSellers.includes("سارة"));

const pdfRows = createPdfTableRows(searchedInvoices);
assert.equal(pdfRows.length, 1);
assert.ok(pdfRows.flat().some((value) => value.includes("العميل الهدف")));
assert.equal(
  buildPdfReportFileName("invoices", januaryFilters, januaryFifteenth),
  "FoamSales-Invoices-Report-2026-01-01-to-2026-01-15.pdf",
);

const repository = readFileSync(resolve("src/lib/data/invoices-repository.ts"), "utf8");
assert.match(repository, /gte\("invoice_date", options\.dateFrom\)/);
assert.match(repository, /lte\("invoice_date", options\.dateTo\)/);
const apiRoute = readFileSync(resolve("src/app/api/invoices/route.ts"), "utf8");
assert.match(apiRoute, /listInvoices\(\{ dateFrom, dateTo \}\)/);
const reportsPage = readFileSync(resolve("src/app/reports/page.tsx"), "utf8");
assert.match(reportsPage, /exportInvoicesToExcel\(filteredInvoices\)/);
assert.match(reportsPage, /invoices: filteredInvoices/);
const quickFilter = readFileSync(resolve("src/components/reports/quick-date-filter.tsx"), "utf8");
assert.match(quickFilter, /max-w-\[calc\(100vw-2rem\)\]/);
const reportsHeader = readFileSync(resolve("src/components/reports/reports-header.tsx"), "utf8");
assert.match(reportsHeader, /grid-cols-2/);

console.log("✓ Saudi quick date ranges, server filtering, search, summaries, Excel, PDF and mobile layout verified");
