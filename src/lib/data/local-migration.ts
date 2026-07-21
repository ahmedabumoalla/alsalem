import "server-only";

import type { Invoice } from "@/lib/types/invoice";
import type { CustomerReceipt } from "@/lib/types/receipt";
import {
  parseInvoiceInput,
  parseLeadInput,
  parsePressureCostInput,
  parseReceiptInput,
} from "@/lib/api/validation";
import {
  createInvoiceRecord,
  findInvoiceByNumber,
} from "@/lib/data/invoices-repository";
import { findLeadByPhone, saveLeadRecord } from "@/lib/data/leads-repository";
import {
  listPressureCosts,
  savePressureCostRecord,
} from "@/lib/data/pressure-costs-repository";
import {
  createReceiptRecord,
  findReceiptByNumber,
} from "@/lib/data/receipts-repository";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database";
import { mergeLegacyPaymentReceipts } from "@/lib/utils/receipt-migration";

export interface LocalMigrationPayload {
  importId: string;
  invoices: unknown[];
  pressureCosts: unknown[];
  receipts: unknown[];
  leads: unknown[];
}

export interface MigrationSection {
  source: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}
export interface LocalMigrationReport {
  importId: string;
  completed: boolean;
  countsMatched: boolean;
  importedAt: string;
  sections: {
    pressureCosts: MigrationSection;
    invoices: MigrationSection;
    receipts: MigrationSection;
    leads: MigrationSection;
  };
  totals: {
    sourceInvoiceTotal: number;
    databaseInvoiceTotal: number;
    sourceReceiptTotal: number;
    databaseReceiptTotal: number;
    matched: boolean;
  };
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const section = (source: number): MigrationSection => ({
  source,
  imported: 0,
  skipped: 0,
  failed: 0,
  errors: [],
});
const rounded = (value: number) => Math.round(value * 100) / 100;

function recordFailure(
  target: MigrationSection,
  index: number,
  error: unknown,
): void {
  target.failed += 1;
  target.errors.push(
    `السجل ${index + 1}: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
  );
}

export async function migrateLocalData(
  payload: LocalMigrationPayload,
): Promise<LocalMigrationReport> {
  const report: LocalMigrationReport = {
    importId: payload.importId,
    completed: false,
    countsMatched: false,
    importedAt: new Date().toISOString(),
    sections: {
      pressureCosts: section(payload.pressureCosts.length),
      invoices: section(payload.invoices.length),
      receipts: section(payload.receipts.length),
      leads: section(payload.leads.length),
    },
    totals: {
      sourceInvoiceTotal: 0,
      databaseInvoiceTotal: 0,
      sourceReceiptTotal: 0,
      databaseReceiptTotal: 0,
      matched: false,
    },
  };

  const invoices: Invoice[] = [];
  for (const [index, raw] of payload.invoices.entries()) {
    try {
      invoices.push(parseInvoiceInput(raw));
    } catch (error) {
      recordFailure(report.sections.invoices, index, error);
    }
  }
  report.totals.sourceInvoiceTotal = rounded(
    invoices.reduce((sum, item) => sum + item.invoiceTotal, 0),
  );

  const rawReceipts: CustomerReceipt[] = [];
  for (const [index, raw] of payload.receipts.entries()) {
    try {
      rawReceipts.push(parseReceiptInput(raw));
    } catch (error) {
      recordFailure(report.sections.receipts, index, error);
    }
  }
  const receipts = mergeLegacyPaymentReceipts(rawReceipts, invoices);
  report.sections.receipts.source += receipts.length - rawReceipts.length;
  report.totals.sourceReceiptTotal = rounded(
    receipts.reduce((sum, item) => sum + item.amount, 0),
  );

  const knownPressures = new Set(
    (await listPressureCosts()).map((item) => item.pressure),
  );
  for (const [index, raw] of payload.pressureCosts.entries()) {
    try {
      const item = parsePressureCostInput(raw);
      if (knownPressures.has(item.pressure)) {
        report.sections.pressureCosts.skipped += 1;
        continue;
      }
      await savePressureCostRecord({
        ...item,
        id: uuidPattern.test(item.id) ? item.id : crypto.randomUUID(),
      });
      knownPressures.add(item.pressure);
      report.sections.pressureCosts.imported += 1;
    } catch (error) {
      recordFailure(report.sections.pressureCosts, index, error);
    }
  }

  const resolvedInvoiceIds = new Map<string, string>();
  let databaseInvoiceTotal = 0;
  for (const [index, invoice] of invoices.entries()) {
    try {
      const existing = await findInvoiceByNumber(invoice.invoiceNumber);
      const stored = existing ?? (await createInvoiceRecord(invoice));
      resolvedInvoiceIds.set(invoice.id, stored.id);
      databaseInvoiceTotal += stored.invoiceTotal;
      if (
        Math.abs(rounded(stored.invoiceTotal) - rounded(invoice.invoiceTotal)) >
          0.01 ||
        stored.items.length !== invoice.items.length
      ) {
        report.sections.invoices.failed += 1;
        report.sections.invoices.errors.push(
          `الفاتورة ${invoice.invoiceNumber}: المصدر ${rounded(invoice.invoiceTotal)}، القاعدة ${rounded(stored.invoiceTotal)}، أو عدد الأصناف غير متطابق.`,
        );
        continue;
      }
      if (existing) report.sections.invoices.skipped += 1;
      else report.sections.invoices.imported += 1;
    } catch (error) {
      recordFailure(report.sections.invoices, index, error);
    }
  }
  report.totals.databaseInvoiceTotal = rounded(databaseInvoiceTotal);
  const invoiceTotalsMatched =
    Math.abs(
      report.totals.sourceInvoiceTotal - report.totals.databaseInvoiceTotal,
    ) <= 0.01;

  let databaseReceiptTotal = 0;
  for (const [index, receipt] of receipts.entries()) {
    try {
      const existing = await findReceiptByNumber(receipt.receiptNumber);
      if (existing) {
        databaseReceiptTotal += existing.amount;
        if (
          Math.abs(rounded(existing.amount) - rounded(receipt.amount)) > 0.01
        ) {
          report.sections.receipts.failed += 1;
          report.sections.receipts.errors.push(
            `السند ${receipt.receiptNumber}: مبلغ المصدر ${rounded(receipt.amount)}، القاعدة ${rounded(existing.amount)}.`,
          );
        } else report.sections.receipts.skipped += 1;
        continue;
      }
      const sourceInvoiceId = receipt.sourceInvoiceId
        ? (resolvedInvoiceIds.get(receipt.sourceInvoiceId) ??
          receipt.sourceInvoiceId)
        : undefined;
      const stored = await createReceiptRecord({ ...receipt, sourceInvoiceId });
      databaseReceiptTotal += stored.amount;
      report.sections.receipts.imported += 1;
    } catch (error) {
      recordFailure(report.sections.receipts, index, error);
    }
  }
  report.totals.databaseReceiptTotal = rounded(databaseReceiptTotal);
  report.totals.matched =
    invoiceTotalsMatched &&
    Math.abs(
      report.totals.sourceReceiptTotal - report.totals.databaseReceiptTotal,
    ) <= 0.01;

  for (const [index, raw] of payload.leads.entries()) {
    try {
      const lead = parseLeadInput(raw);
      if (await findLeadByPhone(lead.phone)) {
        report.sections.leads.skipped += 1;
        continue;
      }
      await saveLeadRecord({
        ...lead,
        id: uuidPattern.test(lead.id) ? lead.id : crypto.randomUUID(),
      });
      report.sections.leads.imported += 1;
    } catch (error) {
      recordFailure(report.sections.leads, index, error);
    }
  }

  const failed = Object.values(report.sections).reduce(
    (sum, item) => sum + item.failed,
    0,
  );
  report.countsMatched = Object.values(report.sections).every(
    (item) => item.source === item.imported + item.skipped + item.failed,
  );
  report.completed =
    failed === 0 && report.countsMatched && report.totals.matched;
  const { error } = await getSupabaseServerClient()
    .from("app_meta")
    .upsert({
      key: "local_storage_import_v1",
      value: report as unknown as Json,
      updated_at: report.importedAt,
    });
  if (error)
    throw new Error(
      `اكتملت معالجة البيانات لكن تعذر تسجيل نتيجة الترحيل: ${error.message}`,
    );
  return report;
}

export async function getLocalMigrationStatus(): Promise<unknown | null> {
  const { data, error } = await getSupabaseServerClient()
    .from("app_meta")
    .select("value")
    .eq("key", "local_storage_import_v1")
    .maybeSingle();
  if (error) throw new Error(`تعذر قراءة حالة الترحيل: ${error.message}`);
  return data?.value ?? null;
}
