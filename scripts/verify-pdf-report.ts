import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
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
  const sellerName = index === 1
    ? "أحمد"
    : index === 2
      ? "عبدالسلام أبو أحمد"
      : `البائع ${index % 5}`;
  const customerName = index === 1
    ? "مؤسسة صرح العقارية"
    : index % 9 === 0
      ? ""
      : `العميل ${index}`;
  return { schemaVersion: INVOICE_SCHEMA_VERSION, id: `invoice-${index}`, invoiceNumber: index === 1 ? "FS-20260722-4RLU" : `FS-2026-${String(index).padStart(4, "0")}`, invoiceDate: index === 1 ? "2026-07-22" : `2026-01-${String(index % 28 + 1).padStart(2, "0")}`, deliveryDate: "2026-08-01", sellerName, customerName, customerPhone: "+966500000000", items: [item], deliveryFee: 25, notes: "ملاحظات سرية", productSubtotal: item.productSubtotal, invoiceTotal, totalCost, netProfit, profitMargin: netProfit / invoiceTotal * 100, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
}

function fonts(): PdfFontData {
  return { regular: readFileSync(resolve("public/fonts/tajawal/Tajawal-Regular.ttf")).toString("base64"), bold: readFileSync(resolve("public/fonts/tajawal/Tajawal-Bold.ttf")).toString("base64") };
}

async function verify() {
  const invoices = Array.from({ length: 140 }, (_, index) => createInvoice(index + 1));
  const totals = createPdfTableTotals(invoices);
  const generatedAt = new Date("2026-07-22T09:30:00Z");
  const filters = { query: "", dateFrom: "2026-01-01", dateTo: "2026-07-31", sellerName: "", customerName: "", densityPressure: "" };
  const invoiceOptions: PdfInvoicesExportOptions = { invoices, filters, generatedAt };
  const generalOptions: PdfGeneralExportOptions = { ...invoiceOptions, summary: { totalSales: 41586.75, totalCost: 34736.74, totalProfit: 6850.01, invoiceCount: invoices.length, itemCount: totals.totalItems, totalQuantity: totals.totalQuantity, averageInvoiceValue: 41586.75 / invoices.length, averageProfitMargin: 6850.01 / 41586.75 * 100 } };

  assert.equal(PDF_LAYOUT.format, "a4");
  assert.equal(PDF_LAYOUT.orientation, "landscape");
  assert.deepEqual(PDF_TABLE_HEADERS, ["التاريخ", "العميل / القياسات", "سعر البيع", "سعر التكلفة", "الفائدة", "البائع"]);
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
  const detailBytes = new Uint8Array(detail.output("arraybuffer"));
  const generalBytes = new Uint8Array(general.output("arraybuffer"));
  assert.ok(detailBytes.byteLength > 10000);
  assert.equal(new TextDecoder("latin1").decode(detailBytes.slice(0, 4)), "%PDF");

  mkdirSync(resolve("tmp/pdfs"), { recursive: true });
  const detailPath = resolve(process.env.PDF_TEST_OUTPUT ?? "tmp/pdfs/verify-invoices.pdf");
  const generalPath = resolve(process.env.PDF_GENERAL_TEST_OUTPUT ?? "tmp/pdfs/verify-general.pdf");
  writeFileSync(detailPath, detailBytes);
  writeFileSync(generalPath, generalBytes);

  const pythonVerification = String.raw`
import fitz, pathlib, re, sys, unicodedata
general_path, detail_path, render_dir = sys.argv[1:4]

def extract(path):
    doc = fitz.open(path)
    text = unicodedata.normalize("NFKC", "\n".join(page.get_text() for page in doc))
    return doc, text

general, general_text = extract(general_path)
detail, detail_text = extract(detail_path)
combined = general_text + "\n" + detail_text

required = [
    "التقرير العام", "تقرير الفواتير", "إجمالي المبيعات", "إجمالي التكلفة",
    "إجمالي الربح", "عدد الفواتير", "هامش الفائدة", "عدد الأصناف",
    "إجمالي الكمية", "متوسط الفاتورة", "التاريخ", "العميل / القياسات",
    "سعر البيع", "سعر التكلفة", "الفائدة", "البائع", "أحمد",
    "عبدالسلام أبو أحمد", "مؤسسة صرح العقارية", "41,586.75", "34,736.74",
    "6,850.01", "2026/07/22",
]
for expected in required:
    if expected not in combined:
        raise AssertionError(f"missing PDF text: {expected!r}")
for truncated in ["لتقرير لعا", "جمالي لمبيعا"]:
    if truncated in combined:
        raise AssertionError(f"truncated PDF text found: {truncated!r}")
if re.search(r"(?<!أ)حمد", combined):
    raise AssertionError("truncated customer/seller name found: حمد")
if len(re.findall(r"2026/\d{2}/\d{2}", detail_text)) < 140:
    raise AssertionError("multi-page invoice report lost table rows")
if detail.page_count <= 1:
    raise AssertionError("invoice report must span multiple pages")

if render_dir:
    output = pathlib.Path(render_dir)
    output.mkdir(parents=True, exist_ok=True)
    for label, doc in [("general", general), ("invoices", detail)]:
        pages = sorted(set([0, doc.page_count - 1]))
        for page_number in pages:
            pixmap = doc[page_number].get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
            pixmap.save(output / f"{label}-page-{page_number + 1}.png")
`;
  const python = spawnSync(
    "python",
    ["-c", pythonVerification, generalPath, detailPath, process.env.PDF_RENDER_DIR ?? ""],
    { encoding: "utf8" },
  );
  if (python.status !== 0) {
    throw new Error(`فشل فحص نص ورندر PDF: ${python.stderr || python.stdout}`);
  }

  if (!process.env.PDF_TEST_OUTPUT) unlinkSync(detailPath);
  if (!process.env.PDF_GENERAL_TEST_OUTPUT) unlinkSync(generalPath);
  console.log(`✓ PDF: Arabic text, A4, six columns, sellers, totals, render check and ${detail.getNumberOfPages()} pages for 140 invoices`);
}

void verify().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
