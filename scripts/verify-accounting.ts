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
import { buildInvoicesCsv, CSV_REPORT_HEADERS } from "../src/lib/utils/csv-export";
import { normalizePhone } from "../src/lib/utils/contact";
import {
  calculateFinancialTotals,
  calculateSellerBreakdown,
  createInvoiceReportRows,
} from "../src/lib/utils/invoice-report";
import type { Invoice } from "../src/lib/types/invoice";

const full = calculateUnitCost(200, 100, 120, 400);
const half = calculateUnitCost(200, 50, 120, 400);
assert.equal(full, 200);
assert.equal(half, 100);
assert.throws(() => calculateUnitCost(Infinity, 100, 120, 400));
assert.throws(() => calculateUnitCost(200, 0, 120, 400));

const automatic = calculateInvoiceItem({ id: "1", lengthCm: 50, widthCm: 120, heightCm: 400, densityPressure: 8, quantity: 3, unitSalePrice: 150, standardBlockCost: 200 });
assert.equal(automatic.costSource, "auto");
assert.equal(automatic.totalCost, 300);
const manual = calculateInvoiceItem({ id: "2", lengthCm: 100, widthCm: 120, heightCm: 400, densityPressure: 8, quantity: 2, unitSalePrice: 350, standardBlockCost: 200, unitCost: 125.25, costSource: "manual" });
assert.equal(manual.totalCost, 250.5);
assert.equal(manual.netProfit, 449.5);
const manualAfterDimensionChange = calculateInvoiceItem({ id: "2", lengthCm: 25, widthCm: 40, heightCm: 50, densityPressure: 8, quantity: 2, unitSalePrice: 350, standardBlockCost: 200, unitCost: 125.25, costSource: "manual" });
assert.equal(manualAfterDimensionChange.unitCost, 125.25);
const resetToAuto = calculateInvoiceItem({ id: "2", lengthCm: 25, widthCm: 40, heightCm: 50, densityPressure: 8, quantity: 2, unitSalePrice: 350, standardBlockCost: 200, costSource: "auto" });
assert.notEqual(resetToAuto.unitCost, 125.25);
assert.throws(() => calculateInvoiceItem({ id: "bad", lengthCm: 1, widthCm: 1, heightCm: 1, densityPressure: 8, quantity: 1, unitSalePrice: 1, standardBlockCost: 1, unitCost: Infinity, costSource: "manual" }));
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

const csv = buildInvoicesCsv([migrated, invoice2]);
assert.equal(csv.split("\n")[0], CSV_REPORT_HEADERS.join(","));
assert.ok(csv.includes("الإجماليات"));
assert.ok(csv.includes("تفصيل البائعين"));
for (const forbidden of ["رقم الفاتورة", "حالة السداد", "رقم التواصل", "وصف قديم", "0555-000-111"]) {
  assert.ok(!csv.includes(forbidden), `CSV must not include ${forbidden}`);
}
console.log("✓ Accounting: auto/manual cost, totals, migration, phones, balances, report and CSV verified");

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
