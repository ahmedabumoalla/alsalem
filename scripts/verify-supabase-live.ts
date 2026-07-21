import assert from "node:assert/strict";
import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../src/lib/supabase/database";

interface TestIdentifiers {
  pressureId: string;
  invoiceId: string;
  itemId: string;
  receiptId: string;
  excessiveReceiptId: string;
  leadId: string;
  customerName: string;
}

type ErrorResult = { error: { message: string } | null };

async function expectNoError(step: string, result: ErrorResult): Promise<void> {
  if (result.error) throw new Error(`${step}: ${result.error.message}`);
}

async function cleanupTestData(
  client: SupabaseClient<Database>,
  identifiers: TestIdentifiers,
): Promise<void> {
  const cleanupErrors: string[] = [];
  const recordCleanup = async (
    step: string,
    operation: PromiseLike<ErrorResult>,
  ) => {
    const result = await operation;
    if (result.error) cleanupErrors.push(`${step}: ${result.error.message}`);
  };

  const customerLookup = await client
    .from("customers")
    .select("id")
    .eq("normalized_name", identifiers.customerName);
  if (customerLookup.error) {
    cleanupErrors.push(`قراءة عميل الاختبار: ${customerLookup.error.message}`);
  }
  const customerIds = customerLookup.data?.map((customer) => customer.id) ?? [];

  await recordCleanup(
    "حذف سندات الاختبار",
    client
      .from("customer_receipts")
      .delete()
      .in("id", [identifiers.receiptId, identifiers.excessiveReceiptId]),
  );
  await recordCleanup(
    "حذف أصناف فاتورة الاختبار",
    client.from("invoice_items").delete().eq("invoice_id", identifiers.invoiceId),
  );
  await recordCleanup(
    "حذف فاتورة الاختبار",
    client.from("invoices").delete().eq("id", identifiers.invoiceId),
  );
  await recordCleanup(
    "حذف العميل المحتمل التجريبي",
    client.from("leads").delete().eq("id", identifiers.leadId),
  );
  await recordCleanup(
    "حذف تكلفة الضغط التجريبية",
    client.from("pressure_costs").delete().eq("id", identifiers.pressureId),
  );
  if (customerIds.length > 0) {
    await recordCleanup(
      "حذف عميل الاختبار",
      client.from("customers").delete().in("id", customerIds),
    );
  }

  const auditedEntityIds = [
    identifiers.pressureId,
    identifiers.invoiceId,
    identifiers.itemId,
    identifiers.receiptId,
    identifiers.excessiveReceiptId,
    identifiers.leadId,
    ...customerIds,
  ];
  await recordCleanup(
    "حذف سجلات تدقيق الاختبار",
    client.from("audit_logs").delete().in("entity_id", auditedEntityIds),
  );

  if (cleanupErrors.length > 0) {
    throw new Error(`فشل تنظيف بعض بيانات الاختبار: ${cleanupErrors.join(" | ")}`);
  }
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());

  if (process.env.SUPABASE_TEST_ALLOW_WRITES !== "1") {
    throw new Error(
      "تم رفض اختبار الكتابة. أضف SUPABASE_TEST_ALLOW_WRITES=1 إلى بيئة مشروع Supabase التجريبي فقط.",
    );
  }

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url) throw new Error("متغير SUPABASE_URL غير موجود في البيئة أو ملف .env.local.");
  if (!secretKey) {
    throw new Error("متغير SUPABASE_SECRET_KEY غير موجود في البيئة أو ملف .env.local.");
  }

  const client = createClient<Database>(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const runId = crypto.randomUUID();
  const identifiers: TestIdentifiers = {
    pressureId: crypto.randomUUID(),
    invoiceId: crypto.randomUUID(),
    itemId: crypto.randomUUID(),
    receiptId: crypto.randomUUID(),
    excessiveReceiptId: crypto.randomUUID(),
    leadId: crypto.randomUUID(),
    customerName: `عميل اختبار ${runId}`,
  };
  const pressure = 900000 + Math.floor(Math.random() * 90000);
  const invoiceNumber = `TEST-${runId}`;
  const receiptNumber = `TEST-RC-${runId}`;
  let operationError: unknown;

  try {
    await expectNoError(
      "فحص الاتصال وجدول app_meta",
      await client.from("app_meta").select("key").eq("key", "schema_version").single(),
    );
    await expectNoError(
      "إنشاء تكلفة ضغط الاختبار",
      await client.from("pressure_costs").insert({
        id: identifiers.pressureId,
        pressure,
        standard_block_cost: 480,
        standard_length_cm: 100,
        standard_width_cm: 120,
        standard_height_cm: 400,
      }),
    );

    const invoice = {
      id: identifiers.invoiceId,
      invoiceNumber,
      invoiceDate: "2026-07-22",
      deliveryDate: "2026-07-22",
      sellerName: "اختبار",
      customerName: identifiers.customerName,
      deliveryFee: 25,
      schemaVersion: 3,
    } as unknown as Json;
    const items = [
      {
        id: identifiers.itemId,
        lengthCm: 50,
        widthCm: 120,
        heightCm: 400,
        densityPressure: pressure,
        quantity: 2,
        unitSalePrice: 300,
        unitCost: 0,
        costSource: "auto",
      },
    ] as unknown as Json;
    const created = await client.rpc("create_invoice_with_items", {
      p_invoice: invoice,
      p_items: items,
    });
    await expectNoError("إنشاء الفاتورة والأصناف ذريًا", created);
    const createdInvoice = created.data as Record<string, unknown>;
    assert.equal(Number(createdInvoice.subtotal), 600);
    assert.equal(Number(createdInvoice.total_cost), 480);
    assert.equal(Number(createdInvoice.invoice_total), 625);
    assert.equal(Number(createdInvoice.net_profit), 145);

    await expectNoError(
      "قراءة فاتورة الاختبار",
      await client.from("invoices").select("id").eq("id", identifiers.invoiceId).single(),
    );
    const updatedHeader = {
      ...(invoice as Record<string, Json | undefined>),
      deliveryFee: 50,
    } as Json;
    const updated = await client.rpc("update_invoice_with_items", {
      p_id: identifiers.invoiceId,
      p_invoice: updatedHeader,
      p_items: items,
    });
    await expectNoError("تحديث فاتورة الاختبار", updated);
    assert.equal(Number((updated.data as Record<string, unknown>).invoice_total), 650);
    await expectNoError(
      "الحذف الناعم لفاتورة الاختبار",
      await client.rpc("soft_delete_invoice", { p_id: identifiers.invoiceId }),
    );
    await expectNoError(
      "استرجاع فاتورة الاختبار",
      await client.rpc("restore_invoice", { p_id: identifiers.invoiceId }),
    );

    const receipt = {
      id: identifiers.receiptId,
      receiptNumber,
      customerName: identifiers.customerName,
      date: "2026-07-22",
      amount: 100,
      paymentMethod: "cash",
      source: "manual",
    } as unknown as Json;
    await expectNoError(
      "إنشاء سند قبض الاختبار",
      await client.rpc("create_customer_receipt", { p_receipt: receipt }),
    );
    const excessive = await client.rpc("create_customer_receipt", {
      p_receipt: {
        ...(receipt as Record<string, Json | undefined>),
        id: identifiers.excessiveReceiptId,
        receiptNumber: `${receiptNumber}-OVER`,
        amount: 100000,
      } as Json,
    });
    assert.ok(excessive.error, "يجب رفض سند القبض الذي يتجاوز مديونية العميل");
    await expectNoError(
      "تحديث سند قبض الاختبار",
      await client.rpc("update_customer_receipt", {
        p_id: identifiers.receiptId,
        p_receipt: {
          ...(receipt as Record<string, Json | undefined>),
          amount: 90,
        } as Json,
      }),
    );
    await expectNoError(
      "الحذف الناعم لسند الاختبار",
      await client.rpc("soft_delete_customer_receipt", { p_id: identifiers.receiptId }),
    );
    await expectNoError(
      "استرجاع سند الاختبار",
      await client.rpc("restore_customer_receipt", { p_id: identifiers.receiptId }),
    );

    const testPhone = `05${runId.replaceAll("-", "").slice(0, 8)}`;
    await expectNoError(
      "إنشاء العميل المحتمل التجريبي",
      await client.from("leads").insert({
        id: identifiers.leadId,
        name: "عميل محتمل اختبار",
        phone: testPhone,
        normalized_phone: testPhone,
        source: "call",
        custom_source: null,
        notes: null,
        status: "new",
        deleted_at: null,
      }),
    );
    console.log(
      "✓ نجح اختبار Supabase الحي: الاتصال والجداول وRPCs والفاتورة والسند ومنع التحصيل الزائد والعميل المحتمل.",
    );
  } catch (error: unknown) {
    operationError = error;
  } finally {
    try {
      await cleanupTestData(client, identifiers);
      console.log("✓ تم تنظيف جميع بيانات الاختبار وسجلات التدقيق المرتبطة بها.");
    } catch (cleanupError: unknown) {
      const cleanupMessage =
        cleanupError instanceof Error ? cleanupError.message : "خطأ تنظيف غير معروف";
      if (operationError) {
        const operationMessage =
          operationError instanceof Error ? operationError.message : "خطأ اختبار غير معروف";
        throw new Error(`${operationMessage} | ${cleanupMessage}`);
      }
      throw cleanupError;
    }
  }

  if (operationError) throw operationError;
}

function safeErrorMessage(error: unknown): string {
  let message = error instanceof Error ? error.message : "خطأ غير معروف";
  for (const sensitiveValue of [
    process.env.SUPABASE_SECRET_KEY,
    process.env.SUPABASE_URL,
  ]) {
    if (sensitiveValue) message = message.replaceAll(sensitiveValue, "[محجوب]");
  }
  return message;
}

void main().catch((error: unknown) => {
  console.error(`✗ فشل اختبار Supabase الحي: ${safeErrorMessage(error)}`);
  process.exitCode = 1;
});
