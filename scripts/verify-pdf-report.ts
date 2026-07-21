import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Invoice } from "../src/lib/types/invoice";
import { INVOICE_SCHEMA_VERSION } from "../src/lib/types/invoice";
import {
  GENERAL_REPORT_PREVIEW_LIMIT,
  PDF_LAYOUT,
  PDF_TABLE_HEADERS,
  PdfExportError,
  buildPdfReportFileName,
  canExportPdf,
  createPdfReportDocument,
  createPdfTableRows,
  createPdfTableTotals,
  formatPdfCurrency,
  formatPdfDate,
  formatPdfNumber,
  getPdfReportComposition,
  isolateLtr,
  type PdfFontData,
  type PdfGeneralExportOptions,
  type PdfInvoicesExportOptions,
} from "../src/lib/utils/pdf-export";

function createInvoice(index: number): Invoice {
  const quantity = index % 4 + 1;
  const item = { id: `item-${index}`, lengthCm: 100, widthCm: 120, heightCm: 400, densityPressure: 8, quantity, unitSalePrice: 300, unitCost: 200, costSource: index % 3 ? "auto" as const : "manual" as const, productSubtotal: 300 * quantity, totalCost: 200 * quantity, netProfit: 100 * quantity };
  const invoiceTotal = item.productSubtotal + 25;
  const totalCost = item.totalCost;
  const netProfit = invoiceTotal - totalCost;
  return { schemaVersion: INVOICE_SCHEMA_VERSION, id: `invoice-${index}`, invoiceNumber: index === 1 ? "FS-20260721-4RLU" : `FS-2026-${String(index).padStart(4, "0")}`, invoiceDate: index === 1 ? "2026-07-21" : `2026-01-${String(index % 28 + 1).padStart(2, "0")}`, deliveryDate: "2026-08-01", sellerName: ` البائع   ${index % 5} `, customerName: index % 9 === 0 ? "" : `العميل ${index}`, customerPhone: "+966500000000", items: [item], deliveryFee: 25, notes: "ملاحظات سرية", productSubtotal: item.productSubtotal, invoiceTotal, totalCost, netProfit, profitMargin: netProfit / invoiceTotal * 100, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
}

function fonts(): PdfFontData {
  return { regular: readFileSync(resolve("public/fonts/tajawal/Tajawal-Regular.ttf")).toString("base64"), bold: readFileSync(resolve("public/fonts/tajawal/Tajawal-Bold.ttf")).toString("base64") };
}

async function verify() {
  const invoices = Array.from({ length: 140 }, (_, index) => createInvoice(index + 1));
  const totals = createPdfTableTotals(invoices);
  const generatedAt = new Date("2026-07-21T09:30:00Z");
  const filters = { dateFrom: "2026-01-01", dateTo: "2026-07-31", sellerName: "", customerName: "", densityPressure: "" };
  const invoiceOptions: PdfInvoicesExportOptions = { invoices, filters, generatedAt };
  const generalOptions: PdfGeneralExportOptions = { ...invoiceOptions, summary: { totalSales: totals.totalSales, totalCost: totals.totalCost, totalProfit: totals.totalProfit, invoiceCount: invoices.length, itemCount: totals.totalItems, totalQuantity: totals.totalQuantity, averageInvoiceValue: totals.totalSales / invoices.length, averageProfitMargin: totals.totalProfit / totals.totalSales * 100 } };

  assert.equal(PDF_LAYOUT.format, "a4");
  assert.equal(PDF_LAYOUT.orientation, "landscape");
  assert.deepEqual(PDF_TABLE_HEADERS, ["التاريخ", "العميل / القياسات", "سعر البيع (ر.س)", "سعر التكلفة (ر.س)", "الفائدة (ر.س)", "البائع"]);
  assert.equal(createPdfTableRows(invoices).length, 140);
  assert.equal(createPdfTableRows([createInvoice(9)])[0].length, 6);
  assert.equal(formatPdfNumber(12500.75), "12,500.75");
  assert.ok(formatPdfCurrency(250).includes("250.00"));
  assert.ok(formatPdfDate("2026-07-21").includes("2026/07/21"));
  assert.ok(isolateLtr("FS-20260721-4RLU").includes("FS-20260721-4RLU"));
  assert.equal(canExportPdf([]), false);
  assert.equal(getPdfReportComposition("general", 140).tableRowCount, GENERAL_REPORT_PREVIEW_LIMIT);
  assert.equal(getPdfReportComposition("general", 140).includesCollectionSummary, false);
  assert.equal(buildPdfReportFileName("invoices", filters, generatedAt), "FoamSales-Invoices-Report-2026-01-01-to-2026-07-31.pdf");
  for (const forbidden of ["رقم الفاتورة", "السداد", "الهاتف", "الملاحظات", "الوصف", "الكمية"]) {
    assert.ok(!PDF_TABLE_HEADERS.some((header) => header.includes(forbidden)));
  }

  await assert.rejects(() => createPdfReportDocument("invoices", { ...invoiceOptions, invoices: [] }, fonts()), (error: unknown) => error instanceof PdfExportError);
  const general = await createPdfReportDocument("general", generalOptions, fonts());
  const detail = await createPdfReportDocument("invoices", invoiceOptions, fonts());
  assert.ok(general.getNumberOfPages() >= 1);
  assert.ok(detail.getNumberOfPages() > 1);
  const bytes = new Uint8Array(detail.output("arraybuffer"));
  assert.ok(bytes.byteLength > 10000);
  assert.equal(new TextDecoder("latin1").decode(bytes.slice(0, 4)), "%PDF");
  if (process.env.PDF_TEST_OUTPUT) writeFileSync(process.env.PDF_TEST_OUTPUT, bytes);
  if (process.env.PDF_GENERAL_TEST_OUTPUT) writeFileSync(process.env.PDF_GENERAL_TEST_OUTPUT, new Uint8Array(general.output("arraybuffer")));
  console.log(`✓ PDF: A4, six columns, sellers, totals and ${detail.getNumberOfPages()} pages for 140 invoices`);
}

void verify().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
