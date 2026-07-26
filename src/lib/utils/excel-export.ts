import { format } from "date-fns";
import { strToU8, zipSync } from "fflate";
import type { Invoice } from "@/lib/types/invoice";
import {
  calculateFinancialTotals,
  calculateSellerBreakdown,
} from "@/lib/utils/invoice-report";

type CellValue = string | number;

export const EXCEL_SHEET_NAMES = ["الفواتير", "ملخص البائعين", "ملخص عام"] as const;

const INVOICE_HEADERS = [
  "رقم الفاتورة",
  "تاريخ الفاتورة",
  "العميل",
  "البائع",
  "الارتفاع (سم)",
  "العرض (سم)",
  "الطول (سم)",
  "الضغط",
  "الكمية",
  "سعر بيع الوحدة",
  "تكلفة الوحدة",
  "مصدر التكلفة",
  "إجمالي المبيعات",
  "إجمالي التكلفة",
  "صافي الربح",
] as const;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number): string {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

function worksheetXml(rows: CellValue[][], widths: number[]): string {
  const cells = rows.map((row, rowIndex) => {
    const rowNumber = rowIndex + 1;
    const values = row.map((value, columnIndex) => {
      const reference = `${columnName(columnIndex)}${rowNumber}`;
      const style = rowIndex === 0 ? 1 : typeof value === "number" ? 2 : 0;
      return typeof value === "number"
        ? `<c r="${reference}" s="${style}"><v>${value}</v></c>`
        : `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
    }).join("");
    return `<row r="${rowNumber}">${values}</row>`;
  }).join("");
  const columns = widths.map((width, index) =>
    `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView rightToLeft="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${columns}</cols>
  <sheetData>${cells}</sheetData>
  <autoFilter ref="A1:${columnName(Math.max(rows[0]?.length ?? 1, 1) - 1)}${Math.max(rows.length, 1)}"/>
</worksheet>`;
}

function invoiceRows(invoices: Invoice[]): CellValue[][] {
  return [
    [...INVOICE_HEADERS],
    ...invoices.flatMap((invoice) =>
      invoice.items.map((item) => [
        invoice.invoiceNumber,
        invoice.invoiceDate,
        invoice.customerName || "غير مسجل",
        invoice.sellerName,
        item.heightCm,
        item.widthCm,
        item.lengthCm,
        item.densityPressure,
        item.quantity,
        item.unitSalePrice,
        item.unitCost,
        item.costSource === "manual" ? "يدوية" : "تلقائية تشمل الهدر",
        item.productSubtotal,
        item.totalCost,
        item.netProfit,
      ])
    ),
  ];
}

function sellerRows(invoices: Invoice[]): CellValue[][] {
  return [
    ["البائع", "عدد الفواتير", "إجمالي المبيعات", "إجمالي التكلفة", "إجمالي الربح"],
    ...calculateSellerBreakdown(invoices).map((seller) => [
      seller.sellerName,
      seller.invoiceCount,
      seller.totalSales,
      seller.totalCost,
      seller.totalProfit,
    ]),
  ];
}

function summaryRows(invoices: Invoice[]): CellValue[][] {
  const totals = calculateFinancialTotals(invoices);
  const itemCount = invoices.reduce((sum, invoice) => sum + invoice.items.length, 0);
  const quantity = invoices.reduce(
    (sum, invoice) => sum + invoice.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );
  return [
    ["المؤشر", "القيمة"],
    ["إجمالي المبيعات", totals.totalSales],
    ["إجمالي التكلفة", totals.totalCost],
    ["إجمالي الربح", totals.totalProfit],
    ["عدد الفواتير", invoices.length],
    ["عدد الأصناف", itemCount],
    ["إجمالي الكمية", quantity],
  ];
}

export function buildInvoicesWorkbook(invoices: Invoice[]): Uint8Array {
  const sheets = [
    worksheetXml(invoiceRows(invoices), [18, 16, 24, 20, 14, 14, 14, 11, 11, 18, 18, 22, 19, 19, 19]),
    worksheetXml(sellerRows(invoices), [24, 16, 20, 20, 20]),
    worksheetXml(summaryRows(invoices), [26, 20]),
  ];
  const workbookSheets = EXCEL_SHEET_NAMES.map((name, index) =>
    `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
  ).join("");
  const relationships = EXCEL_SHEET_NAMES.map((_, index) =>
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
  ).join("");
  const sheetOverrides = EXCEL_SHEET_NAMES.map((_, index) =>
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join("");

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${relationships}
  <Relationship Id="rId${EXCEL_SHEET_NAMES.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    "xl/styles.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2D665C"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>
</styleSheet>`),
  };
  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(sheet);
  });
  return zipSync(files, { level: 6 });
}

export function exportInvoicesToExcel(invoices: Invoice[]): void {
  const bytes = buildInvoicesWorkbook(invoices);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `foam-sales-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
