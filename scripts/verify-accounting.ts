import assert from "node:assert/strict";
import {
  calculateInvoiceItem,
  calculateInvoiceTotals,
  calculateUnitCost,
} from "../src/lib/utils/invoice-calculations";
import { normalizeInvoice, needsInvoiceMigration } from "../src/lib/utils/invoice-normalize";
import { createLegacyPaymentReceipts, mergeLegacyPaymentReceipts } from "../src/lib/utils/receipt-migration";
import {
  buildCustomerStatement,
  calculateCustomerBalances,
  validateReceiptAmount,
} from "../src/lib/utils/customer-accounting";
import { strFromU8, unzipSync } from "fflate";
import {
  buildInvoicesWorkbook,
  EXCEL_SHEET_NAMES,
} from "../src/lib/utils/excel-export";
import { normalizePhone } from "../src/lib/utils/contact";
import {
  calculateFinancialTotals,
  calculateSellerBreakdown,
  createInvoiceReportRows,
} from "../src/lib/utils/invoice-report";
import type { Invoice } from "../src/lib/types/invoice";

const full = calculateUnitCost(200, 400, 120, 100);
const half = calculateUnitCost(200, 400, 120, 50);
assert.equal(full, 200);
assert.equal(half, 100);
const nineteenByFortyByTwoHundred = calculateUnitCost(718, 200, 40, 19);
const twentyByFortyByTwoHundred = calculateUnitCost(718, 200, 40, 20);
assert.equal(nineteenByFortyByTwoHundred, 22.74);
assert.equal(twentyByFortyByTwoHundred, 23.93);
assert.notEqual(nineteenByFortyByTwoHundred, twentyByFortyByTwoHundred);
assert.equal(calculateUnitCost(480, 300, 20, 10), 6);
assert.throws(() => calculateUnitCost(Infinity, 400, 120, 100));
assert.throws(() => calculateUnitCost(200, 400, 120, 0));
assert.equal(calculateUnitCost(200, 401, 120, 100), 200.5);

const automatic = calculateInvoiceItem({ id: "1", lengthCm: 400, widthCm: 120, heightCm: 50, densityPressure: 8, quantity: 3, unitSalePrice: 150, standardBlockCost: 200 });
assert.equal(automatic.costSource, "auto");
assert.equal(automatic.totalCost, 300);
const volumeQuantity = calculateInvoiceItem({ id: "volume-quantity", lengthCm: 200, widthCm: 40, heightCm: 19, densityPressure: 8, quantity: 3, unitSalePrice: 100, standardBlockCost: 718 });
assert.equal(volumeQuantity.unitCost, 22.74);
assert.equal(volumeQuantity.totalCost, 68.21);
const manual = calculateInvoiceItem({ id: "2", lengthCm: 400, widthCm: 120, heightCm: 100, densityPressure: 8, quantity: 2, unitSalePrice: 350, standardBlockCost: 200, unitCost: 125.25, costSource: "manual" });
assert.equal(manual.totalCost, 250.5);
assert.equal(manual.netProfit, 449.5);
const manualAfterDimensionChange = calculateInvoiceItem({ id: "2", lengthCm: 25, widthCm: 40, heightCm: 50, densityPressure: 8, quantity: 2, unitSalePrice: 350, standardBlockCost: 200, unitCost: 125.25, costSource: "manual" });
assert.equal(manualAfterDimensionChange.unitCost, 125.25);
const resetToAuto = calculateInvoiceItem({ id: "2", lengthCm: 25, widthCm: 40, heightCm: 50, densityPressure: 8, quantity: 2, unitSalePrice: 350, standardBlockCost: 200, costSource: "auto" });
assert.notEqual(resetToAuto.unitCost, 125.25);
assert.throws(() => calculateInvoiceItem({ id: "bad", lengthCm: 1, widthCm: 1, heightCm: 1, densityPressure: 8, quantity: 1, unitSalePrice: 1, standardBlockCost: 1, unitCost: Infinity, costSource: "manual" }));
const distinctDimensions = calculateInvoiceItem({ id: "dimensions", heightCm: 10, widthCm: 20, lengthCm: 300, densityPressure: 8, quantity: 1, unitSalePrice: 100, standardBlockCost: 480 });
assert.equal(distinctDimensions.heightCm, 10);
assert.equal(distinctDimensions.widthCm, 20);
assert.equal(distinctDimensions.lengthCm, 300);
const totals = calculateInvoiceTotals([automatic, manual], 50);
assert.deepEqual(totals, { productSubtotal: 1150, invoiceTotal: 1200, totalCost: 550.5, netProfit: 649.5, profitMargin: 54.13 });

const old = { id: "old-1", invoiceNumber: "OLD-1", invoiceDate: "2026-01-01", deliveryDate: "2026-01-02", sellerName: "  سالم   علي ", customerName: "  شركة   ألف ", customerPhone: "0555-000-111", paymentStatus: "partial" as const, paymentMethod: "cash" as const, amountPaid: 25, lengthCm: 10, widthCm: 20, thicknessCm: 5, densityPressure: 8, unitSalePrice: 50, unitCost: 20, quantity: 2, deliveryFee: 5, productSubtotal: 100, invoiceTotal: 105, totalCost: 40, netProfit: 65, profitMargin: 61.9, description: "وصف قديم يجب تجاهله", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };
assert.equal(needsInvoiceMigration(old), true);
const migrated = normalizeInvoice(old);
assert.equal(migrated.items.length, 1);
assert.equal(migrated.items[0].heightCm, 5);
assert.equal(migrated.items[0].costSource, "auto");
assert.equal("description" in migrated.items[0], false);
assert.equal(migrated.invoiceTotal, 105);
assert.equal(normalizePhone(" +966 55-500-0111 "), "+966555000111");

const legacy = createLegacyPaymentReceipts([migrated]);
assert.equal(legacy.length, 1);
assert.equal(mergeLegacyPaymentReceipts(legacy, [migrated]).length, 1);
const invoice2: Invoice = { ...migrated, id: "old-2", invoiceNumber: "OLD-2", invoiceDate: "2026-02-01", updatedAt: "2026-02-01T12:00:00Z", invoiceTotal: 95, customerName: "شركة ألف", customerPhone: "+966 50 000 0000", amountPaid: undefined };
const unnamed: Invoice = { ...migrated, id: "old-3", invoiceNumber: "OLD-3", customerName: "   ", customerPhone: "0500000001" };
const receipts = [{ ...legacy[0], customerName: "شركة ألف", amount: 25 }];
const balances = calculateCustomerBalances([migrated, invoice2, unnamed], receipts);
assert.equal(balances.length, 1);
assert.equal(balances[0].totalSales, 200);
assert.equal(balances[0].balance, 175);
assert.equal(balances[0].customerPhone, "+966500000000");
assert.equal(validateReceiptAmount(176, 175), "مبلغ السند لا يمكن أن يتجاوز مديونية العميل");
assert.equal(validateReceiptAmount(175, 175), undefined);
assert.equal(validateReceiptAmount(500, 175), "مبلغ السند لا يمكن أن يتجاوز مديونية العميل");
assert.equal(validateReceiptAmount(100, 175), undefined);
assert.equal(validateReceiptAmount(1, 0), "مبلغ السند لا يمكن أن يتجاوز مديونية العميل");
const statement = buildCustomerStatement("شركة ألف", [migrated, invoice2], receipts);
assert.equal(statement.at(-1)?.runningBalance, 175);

const rows = createInvoiceReportRows([migrated, unnamed]);
assert.equal(rows[0].customerOrMeasurements, "شركة ألف");
assert.match(rows[1].customerOrMeasurements, /10×20×5 - ضغط 8/);
const sellers = calculateSellerBreakdown([migrated, invoice2]);
assert.equal(sellers.length, 1);
assert.equal(sellers[0].sellerName, "سالم علي");
assert.equal(sellers[0].invoiceCount, 2);
assert.deepEqual(calculateFinancialTotals([migrated, invoice2]), { totalSales: 200, totalCost: 80, totalProfit: 130 });

const workbook = buildInvoicesWorkbook([migrated, invoice2]);
assert.equal(strFromU8(workbook.subarray(0, 2)), "PK");
const workbookFiles = unzipSync(workbook);
const workbookXml = strFromU8(workbookFiles["xl/workbook.xml"]);
const invoicesSheetXml = strFromU8(workbookFiles["xl/worksheets/sheet1.xml"]);
for (const sheetName of EXCEL_SHEET_NAMES) assert.ok(workbookXml.includes(sheetName));
assert.ok(invoicesSheetXml.includes("رقم الفاتورة"));
assert.ok(invoicesSheetXml.includes("مصدر التكلفة"));
for (const forbidden of ["حالة السداد", "رقم التواصل", "وصف قديم", "0555-000-111"]) {
  assert.ok(!invoicesSheetXml.includes(forbidden), `Excel must not include ${forbidden}`);
}
console.log("✓ Accounting: volume-based cost, manual override, totals, reports and real Excel verified");

async function verifyStorageMigration() {
  const memory = new Map<string, string>();
  const fakeStorage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => void memory.set(key, value), removeItem: (key: string) => void memory.delete(key), clear: () => memory.clear(), key: (index: number) => [...memory.keys()][index] ?? null, get length() { return memory.size; } };
  Object.defineProperty(globalThis, "window", { value: { localStorage: fakeStorage }, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: fakeStorage, configurable: true });
  const rawOld = JSON.stringify([old]);
  memory.set("foam_sales_invoices", rawOld);
  const storage = await import("../src/lib/storage/invoice-storage");
  storage.getInvoicesSnapshot();
  assert.equal(memory.get("foam_sales_invoices_backup_v1"), rawOld);
  const firstBackup = memory.get("foam_sales_invoices_backup_v1");
  memory.set("foam_sales_invoices", JSON.stringify([{ ...old, id: "old-4" }]));
  storage.invalidateInvoicesSnapshot();
  storage.getInvoicesSnapshot();
  assert.equal(memory.get("foam_sales_invoices_backup_v1"), firstBackup);
  console.log("✓ Migration backup remains one-time and legacy descriptions are ignored");
}

void verifyStorageMigration().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
