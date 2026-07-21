import type { jsPDF as JsPdfDocument } from "jspdf";
import type { RowInput } from "jspdf-autotable";
import type { Invoice } from "@/lib/types/invoice";
import type { InvoiceFilters } from "@/lib/utils/invoice-filters";
import {
  createInvoiceReportRows,
  calculateSellerBreakdown,
} from "@/lib/utils/invoice-report";

export type PdfReportType = "general" | "invoices";
export type PdfReportFilters = InvoiceFilters;

export interface PdfReportSummary {
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  invoiceCount: number;
  itemCount: number;
  totalQuantity: number;
  averageInvoiceValue: number;
  averageProfitMargin: number;
}

export interface PdfInvoicesExportOptions {
  invoices: Invoice[];
  filters: PdfReportFilters;
  generatedAt?: Date;
}

export interface PdfGeneralExportOptions extends PdfInvoicesExportOptions {
  summary: PdfReportSummary;
}

export interface PdfFontData {
  regular: string;
  bold: string;
}

export const PDF_LAYOUT = {
  format: "a4",
  orientation: "landscape",
  margin: 14,
  footerHeight: 17,
  tableFontSize: 8.5,
} as const;

export const GENERAL_REPORT_PREVIEW_LIMIT = 10;
export const PDF_TABLE_HEADERS = [
  "التاريخ",
  "العميل / القياسات",
  "سعر البيع (ر.س)",
  "سعر التكلفة (ر.س)",
  "الفائدة (ر.س)",
  "البائع",
] as const;

export interface PdfReportComposition {
  title: string;
  includesFinancialSummary: boolean;
  includesCollectionSummary: boolean;
  sourceInvoiceCount: number;
  tableRowCount: number;
}

export class PdfExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfExportError";
  }
}

const LRI = "\u2066";
const RLI = "\u2067";
const PDI = "\u2069";

export function isolateLtr(value: string | number): string {
  return `${LRI}${value}${PDI}`;
}

export function isolateRtl(value: string): string {
  return `${RLI}${value}${PDI}`;
}

export function formatPdfNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: true,
  }).format(value);
}

export function formatPdfCurrency(value: number): string {
  return `${isolateLtr(formatPdfNumber(value))} ${isolateRtl("ر.س")}`;
}

export function formatPdfDate(value: string): string {
  return isolateLtr(value.replace(/-/g, "/"));
}

const COLORS = {
  primary: [24, 59, 54] as [number, number, number],
  secondary: [45, 102, 92] as [number, number, number],
  accent: [217, 164, 65] as [number, number, number],
  background: [247, 248, 245] as [number, number, number],
  border: [228, 232, 226] as [number, number, number],
  muted: [100, 112, 103] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

let cachedFonts: Promise<PdfFontData> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function fetchFont(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new PdfExportError(
      `تعذر تحميل الخط العربي المطلوب للتقرير (${response.status}).`,
    );
  }
  return arrayBufferToBase64(await response.arrayBuffer());
}

async function loadFonts(): Promise<PdfFontData> {
  cachedFonts ??= Promise.all([
    fetchFont("/fonts/tajawal/Tajawal-Regular.ttf"),
    fetchFont("/fonts/tajawal/Tajawal-Bold.ttf"),
  ]).then(([regular, bold]) => ({ regular, bold }));

  try {
    return await cachedFonts;
  } catch (error) {
    cachedFonts = null;
    if (error instanceof PdfExportError) throw error;
    throw new PdfExportError("تعذر تحميل خط Tajawal المستخدم في تقرير PDF.");
  }
}

function registerFonts(doc: JsPdfDocument, fonts: PdfFontData) {
  doc.addFileToVFS("Tajawal-Regular.ttf", fonts.regular);
  doc.addFont("Tajawal-Regular.ttf", "Tajawal", "normal");
  doc.addFileToVFS("Tajawal-Bold.ttf", fonts.bold);
  doc.addFont("Tajawal-Bold.ttf", "Tajawal", "bold");
  doc.setFont("Tajawal", "normal");
  doc.setR2L(false);
}

export function getActivePdfFilterLabels(filters: PdfReportFilters): string[] {
  const labels: string[] = [];
  if (filters.sellerName) labels.push(`البائع: ${filters.sellerName}`);
  if (filters.customerName) labels.push(`العميل: ${filters.customerName}`);
  if (filters.densityPressure) {
    labels.push(`الضغط: ${isolateLtr(filters.densityPressure)}`);
  }
  return labels;
}

export function getPdfReportComposition(
  type: PdfReportType,
  count: number,
): PdfReportComposition {
  return {
    title: type === "general" ? "التقرير العام" : "تقرير الفواتير",
    includesFinancialSummary: true,
    includesCollectionSummary: false,
    sourceInvoiceCount: count,
    tableRowCount:
      type === "general" ? Math.min(count, GENERAL_REPORT_PREVIEW_LIMIT) : count,
  };
}

export function buildPdfReportFileName(
  type: PdfReportType,
  filters: PdfReportFilters,
  generatedAt = new Date(),
): string {
  let scope = generatedAt.toISOString().slice(0, 10);
  if (filters.dateFrom && filters.dateTo) {
    scope = `${filters.dateFrom}-to-${filters.dateTo}`;
  } else if (filters.dateFrom) {
    scope = `from-${filters.dateFrom}`;
  } else if (filters.dateTo) {
    scope = `to-${filters.dateTo}`;
  }
  return `FoamSales-${type === "general" ? "General" : "Invoices"}-Report-${scope}.pdf`;
}

export function canExportPdf(invoices: Invoice[]): boolean {
  return invoices.length > 0;
}

export function createPdfTableRows(invoices: Invoice[]): string[][] {
  return createInvoiceReportRows(invoices).map((row) =>
    [
      formatPdfDate(row.date),
      isolateRtl(row.customerOrMeasurements),
      isolateLtr(formatPdfNumber(row.sales)),
      isolateLtr(formatPdfNumber(row.cost)),
      isolateLtr(formatPdfNumber(row.profit)),
      isolateRtl(row.sellerName),
    ].reverse(),
  );
}

export interface PdfTableTotals {
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  totalQuantity: number;
  totalItems: number;
}

export function createPdfTableTotals(invoices: Invoice[]): PdfTableTotals {
  return invoices.reduce(
    (total, invoice) => ({
      totalSales: total.totalSales + invoice.invoiceTotal,
      totalCost: total.totalCost + invoice.totalCost,
      totalProfit: total.totalProfit + invoice.netProfit,
      totalQuantity:
        total.totalQuantity +
        invoice.items.reduce((sum, item) => sum + item.quantity, 0),
      totalItems: total.totalItems + invoice.items.length,
    }),
    {
      totalSales: 0,
      totalCost: 0,
      totalProfit: 0,
      totalQuantity: 0,
      totalItems: 0,
    },
  );
}

export function createPdfTableFoot(
  totals: PdfTableTotals,
  label = "الإجمالي",
): RowInput[] {
  return [
    [
      isolateRtl(label),
      "",
      isolateLtr(formatPdfNumber(totals.totalSales)),
      isolateLtr(formatPdfNumber(totals.totalCost)),
      isolateLtr(formatPdfNumber(totals.totalProfit)),
      "",
    ].reverse(),
  ];
}

function drawHeader(
  doc: JsPdfDocument,
  title: string,
  filters: PdfReportFilters,
  generatedAt: Date,
  invoiceCount: number,
): number {
  const width = doc.internal.pageSize.getWidth();
  const right = width - PDF_LAYOUT.margin;
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, width, 32, "F");
  doc.setFont("Tajawal", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.white);
  doc.text(title, right, 14, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("FoamSales", PDF_LAYOUT.margin, 14, { align: "left" });
  doc.setFont("Tajawal", "normal");
  doc.setFontSize(9);
  doc.text(`عدد الفواتير: ${isolateLtr(invoiceCount)}`, right, 23, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated: ${generatedAt.toISOString().replace("T", " ").slice(0, 16)}`,
    PDF_LAYOUT.margin,
    23,
    { align: "left" },
  );

  const labels = getActivePdfFilterLabels(filters);
  let y = 40;
  doc.setTextColor(...COLORS.primary);
  doc.setFont("Tajawal", "normal");
  doc.text(
    filters.dateFrom || filters.dateTo
      ? `النطاق: ${formatPdfDate(filters.dateFrom || "...")} - ${formatPdfDate(filters.dateTo || "...")}`
      : "النطاق: جميع التواريخ",
    right,
    y,
    { align: "right" },
  );
  if (labels.length) {
    y += 7;
    doc.text(labels.join("   |   "), right, y, { align: "right" });
  }
  return y + 8;
}

function drawSummaryCards(
  doc: JsPdfDocument,
  summary: PdfReportSummary,
  startY: number,
  compact: boolean,
): number {
  const width = doc.internal.pageSize.getWidth();
  const gap = 4;
  const columns = 4;
  const cardWidth =
    (width - PDF_LAYOUT.margin * 2 - gap * (columns - 1)) / columns;
  const cards: [string, string][] = [
    ["إجمالي المبيعات (ر.س)", isolateLtr(formatPdfNumber(summary.totalSales))],
    ["إجمالي التكلفة (ر.س)", isolateLtr(formatPdfNumber(summary.totalCost))],
    ["إجمالي الربح (ر.س)", isolateLtr(formatPdfNumber(summary.totalProfit))],
    ["عدد الفواتير", isolateLtr(summary.invoiceCount)],
  ];
  if (!compact) {
    cards.push(
      ["هامش الفائدة", `${isolateLtr(formatPdfNumber(summary.averageProfitMargin))}%`],
      ["عدد الأصناف", isolateLtr(summary.itemCount)],
      ["إجمالي الكمية", isolateLtr(summary.totalQuantity)],
      ["متوسط الفاتورة (ر.س)", isolateLtr(formatPdfNumber(summary.averageInvoiceValue))],
    );
  }

  cards.forEach(([label, value], index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x =
      width -
      PDF_LAYOUT.margin -
      (column + 1) * cardWidth -
      column * gap;
    const y = startY + row * 25;
    doc.setFillColor(...COLORS.background);
    doc.roundedRect(x, y, cardWidth, 21, 2, 2, "F");
    doc.setFont("Tajawal", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(label, x + cardWidth - 3, y + 7, { align: "right" });
    doc.setFont("Tajawal", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.primary);
    doc.text(value, x + cardWidth - 3, y + 16, { align: "right" });
  });
  return startY + (compact ? 29 : 54);
}

function drawFooters(doc: JsPdfDocument, generatedAt: Date) {
  const pages = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.border);
    doc.line(
      PDF_LAYOUT.margin,
      height - 12,
      width - PDF_LAYOUT.margin,
      height - 12,
    );
    doc.setFont("Tajawal", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text("تم إنشاء التقرير من نظام FoamSales", width - PDF_LAYOUT.margin, height - 6, {
      align: "right",
    });
    doc.setFont("helvetica", "normal");
    doc.text(`${page} / ${pages}`, width / 2, height - 6, { align: "center" });
    doc.text(generatedAt.toISOString().slice(0, 10), PDF_LAYOUT.margin, height - 6, {
      align: "left",
    });
  }
}

function toSummary(invoices: Invoice[]): PdfReportSummary {
  const totals = createPdfTableTotals(invoices);
  return {
    totalSales: totals.totalSales,
    totalCost: totals.totalCost,
    totalProfit: totals.totalProfit,
    invoiceCount: invoices.length,
    itemCount: totals.totalItems,
    totalQuantity: totals.totalQuantity,
    averageInvoiceValue: invoices.length ? totals.totalSales / invoices.length : 0,
    averageProfitMargin: totals.totalSales
      ? (totals.totalProfit / totals.totalSales) * 100
      : 0,
  };
}

export async function createPdfReportDocument(
  type: PdfReportType,
  options: PdfGeneralExportOptions | PdfInvoicesExportOptions,
  fonts?: PdfFontData,
): Promise<JsPdfDocument> {
  if (!options.invoices.length) {
    throw new PdfExportError("لا توجد فواتير مطابقة للتصدير.");
  }

  const [{ jsPDF }, { default: autoTable }, fontData] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    fonts ? Promise.resolve(fonts) : loadFonts(),
  ]);
  const doc = new jsPDF({
    orientation: PDF_LAYOUT.orientation,
    unit: "mm",
    format: PDF_LAYOUT.format,
  });
  registerFonts(doc, fontData);

  const generatedAt = options.generatedAt ?? new Date();
  const title = type === "general" ? "التقرير العام" : "تقرير الفواتير";
  const summary = type === "general" && "summary" in options
    ? options.summary
    : toSummary(options.invoices);
  let y = drawHeader(
    doc,
    title,
    options.filters,
    generatedAt,
    options.invoices.length,
  );
  y = drawSummaryCards(doc, summary, y, type === "invoices");

  const source =
    type === "general"
      ? options.invoices.slice(0, GENERAL_REPORT_PREVIEW_LIMIT)
      : options.invoices;
  autoTable(doc, {
    startY: y,
    head: [PDF_TABLE_HEADERS.slice().reverse()],
    body: createPdfTableRows(source),
    foot: createPdfTableFoot(
      createPdfTableTotals(source),
      type === "general" ? "إجمالي العينة" : "الإجمالي",
    ),
    showHead: "everyPage",
    showFoot: "lastPage",
    margin: {
      top: 57,
      right: PDF_LAYOUT.margin,
      bottom: PDF_LAYOUT.footerHeight,
      left: PDF_LAYOUT.margin,
    },
    styles: {
      font: "Tajawal",
      fontStyle: "normal",
      fontSize: PDF_LAYOUT.tableFontSize,
      halign: "right",
      cellPadding: 2,
      textColor: COLORS.primary,
      lineColor: COLORS.border,
      lineWidth: 0.15,
    },
    headStyles: {
      font: "Tajawal",
      fontStyle: "bold",
      fillColor: COLORS.secondary,
      textColor: COLORS.white,
      halign: "right",
    },
    footStyles: {
      font: "Tajawal",
      fontStyle: "bold",
      fillColor: COLORS.background,
      textColor: COLORS.primary,
    },
    willDrawPage: () => {
      if (doc.getNumberOfPages() > 1) {
        drawHeader(
          doc,
          title,
          options.filters,
          generatedAt,
          options.invoices.length,
        );
      }
    },
  });

  if (type === "invoices") {
    const tableDoc = doc as JsPdfDocument & {
      lastAutoTable?: { finalY: number };
    };
    const pageHeight = doc.internal.pageSize.getHeight();
    let sellerTitleY = (tableDoc.lastAutoTable?.finalY ?? y) + 10;
    if (sellerTitleY > pageHeight - 42) {
      doc.addPage();
      drawHeader(doc, title, options.filters, generatedAt, options.invoices.length);
      sellerTitleY = 55;
    }
    doc.setFont("Tajawal", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.primary);
    doc.text(
      "تفاصيل الإجماليات حسب البائع",
      doc.internal.pageSize.getWidth() - PDF_LAYOUT.margin,
      sellerTitleY,
      { align: "right" },
    );

    const sellerRows = calculateSellerBreakdown(options.invoices).map((seller) =>
      [
        isolateRtl(seller.sellerName),
        isolateLtr(formatPdfNumber(seller.totalSales)),
        isolateLtr(formatPdfNumber(seller.totalCost)),
        isolateLtr(formatPdfNumber(seller.totalProfit)),
      ].reverse(),
    );
    autoTable(doc, {
      startY: sellerTitleY + 4,
      head: [["البائع", "إجمالي المبيعات", "إجمالي التكلفة", "إجمالي الربح"].reverse()],
      body: sellerRows,
      showHead: "everyPage",
      margin: {
        top: 62,
        right: PDF_LAYOUT.margin,
        bottom: PDF_LAYOUT.footerHeight,
        left: PDF_LAYOUT.margin,
      },
      styles: {
        font: "Tajawal",
        fontSize: PDF_LAYOUT.tableFontSize,
        halign: "right",
        cellPadding: 2,
        textColor: COLORS.primary,
        lineColor: COLORS.border,
        lineWidth: 0.15,
      },
      headStyles: {
        font: "Tajawal",
        fontStyle: "bold",
        fillColor: COLORS.accent,
        textColor: COLORS.primary,
      },
      willDrawPage: () => {
        if (doc.getNumberOfPages() > 1) {
          drawHeader(
            doc,
            title,
            options.filters,
            generatedAt,
            options.invoices.length,
          );
        }
      },
    });
  }

  drawFooters(doc, generatedAt);
  return doc;
}

async function save(
  type: PdfReportType,
  options: PdfGeneralExportOptions | PdfInvoicesExportOptions,
) {
  const doc = await createPdfReportDocument(type, options);
  doc.save(buildPdfReportFileName(type, options.filters, options.generatedAt));
}

export function exportGeneralReportPdf(options: PdfGeneralExportOptions) {
  return save("general", options);
}

export function exportInvoicesReportPdf(options: PdfInvoicesExportOptions) {
  return save("invoices", options);
}
