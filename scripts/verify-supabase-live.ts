import assert from "node:assert/strict";
import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../src/lib/supabase/database";

type ErrorResult = { error: { message: string } | null };

async function expectNoError(step: string, result: ErrorResult): Promise<void> {
  if (result.error) throw new Error(`${step}: ${result.error.message}`);
}

function invoicePayload(id: string, invoiceNumber: string, customerName: string): Json {
  return {
    id,
    invoiceNumber,
    invoiceDate: "2026-07-22",
    deliveryDate: "2026-07-22",
    sellerName: "اختبار كودكس",
    customerName,
    deliveryFee: 0,
    schemaVersion: 3,
  };
}

function itemPayload(id: string, pressure: number, unitSalePrice = 1000): Json {
  return [{
    id,
    heightCm: 10,
    widthCm: 20,
    lengthCm: 300,
    densityPressure: pressure,
    quantity: 1,
    unitSalePrice,
    unitCost: 0,
    costSource: "auto",
  }];
}

async function cleanup(
  client: SupabaseClient<Database>,
  pressureId: string,
  invoiceIds: string[],
  customerNames: string[],
): Promise<void> {
  const errors: string[] = [];
  const record = async (label: string, operation: PromiseLike<ErrorResult>) => {
    const result = await operation;
    if (result.error) errors.push(`${label}: ${result.error.message}`);
  };

  const receipts = await client
    .from("customer_receipts")
    .select("id,customer_id")
    .in("source_invoice_id", invoiceIds);
  if (receipts.error) errors.push(`قراءة سندات الاختبار: ${receipts.error.message}`);
  const receiptIds = receipts.data?.map((row) => row.id) ?? [];
  const customerIds = [...new Set(receipts.data?.flatMap((row) => row.customer_id ? [row.customer_id] : []) ?? [])];

  await record("حذف سندات الاختبار", client.from("customer_receipts").delete().in("source_invoice_id", invoiceIds));
  await record("حذف أصناف الاختبار", client.from("invoice_items").delete().in("invoice_id", invoiceIds));
  await record("حذف فواتير الاختبار", client.from("invoices").delete().in("id", invoiceIds));

  const namedCustomers = await client.from("customers").select("id").in("normalized_name", customerNames);
  if (namedCustomers.error) errors.push(`قراءة عملاء الاختبار: ${namedCustomers.error.message}`);
  for (const row of namedCustomers.data ?? []) customerIds.push(row.id);
  if (customerIds.length) {
    await record("حذف عملاء الاختبار", client.from("customers").delete().in("id", [...new Set(customerIds)]));
  }
  await record("حذف تكلفة الضغط", client.from("pressure_costs").delete().eq("id", pressureId));

  const auditedIds = [...new Set([pressureId, ...invoiceIds, ...receiptIds, ...customerIds])];
  await record("حذف سجلات التدقيق", client.from("audit_logs").delete().in("entity_id", auditedIds));
  if (errors.length) throw new Error(`فشل تنظيف بيانات الاختبار: ${errors.join(" | ")}`);
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  if (process.env.SUPABASE_TEST_ALLOW_WRITES !== "1") {
    throw new Error("تم رفض اختبار الكتابة. أضف SUPABASE_TEST_ALLOW_WRITES=1 إلى بيئة مشروع Supabase التجريبي فقط.");
  }
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error("متغيرا SUPABASE_URL وSUPABASE_SECRET_KEY مطلوبان للاختبار الحي.");

  const client = createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const runId = crypto.randomUUID();
  const pressureId = crypto.randomUUID();
  const pressure = 900000 + Math.floor(Math.random() * 90000);
  const customerNames = [`عميل جزئي ${runId}`, `عميل آجل ${runId}`, `عميل بدون دفعة ${runId}`];
  const ids = {
    none: crypto.randomUUID(),
    deferred: crypto.randomUUID(),
    partial: crypto.randomUUID(),
    paidUnnamed: crypto.randomUUID(),
    invalid: crypto.randomUUID(),
    rollback: crypto.randomUUID(),
  };
  const invoiceIds = Object.values(ids);
  const items = Object.fromEntries(invoiceIds.map((id) => [id, crypto.randomUUID()]));
  let operationError: unknown;

  try {
    await expectNoError("فحص الاتصال", await client.from("app_meta").select("key").eq("key", "schema_version").single());
    await expectNoError("إنشاء تكلفة الضغط", await client.from("pressure_costs").insert({
      id: pressureId,
      pressure,
      standard_block_cost: 480,
      standard_length_cm: 100,
      standard_width_cm: 120,
      standard_height_cm: 400,
    }));

    const cashCustomerBefore = await client.from("customers").select("id", { count: "exact", head: true }).eq("normalized_name", "عميل نقدي");
    await expectNoError("عد العملاء النقديين قبل الاختبار", cashCustomerBefore);

    const create = (invoiceId: string, customerName: string, mode: string, amount?: number, paymentMethod = "cash") =>
      client.rpc("create_invoice_with_initial_payment", {
        p_invoice: invoicePayload(invoiceId, `TEST-${runId}-${mode}-${invoiceId.slice(0, 4)}`, customerName),
        p_items: itemPayload(items[invoiceId], pressure),
        p_initial_payment: { mode, amount, paymentMethod } as Json,
      });

    const none = await create(ids.none, customerNames[2], "none");
    await expectNoError("إنشاء فاتورة بلا دفعة", none);
    assert.equal((none.data as Record<string, unknown>).initial_receipt, null);

    const dimensions = await client.from("invoice_items").select("height_cm,width_cm,length_cm").eq("invoice_id", ids.none).single();
    await expectNoError("قراءة القياسات", dimensions);
    assert.equal(Number(dimensions.data?.height_cm), 10);
    assert.equal(Number(dimensions.data?.width_cm), 20);
    assert.equal(Number(dimensions.data?.length_cm), 300);

    const noneRetry = await create(ids.none, customerNames[2], "none");
    await expectNoError("إعادة طلب فاتورة بلا دفعة", noneRetry);

    const deferred = await create(ids.deferred, customerNames[1], "deferred");
    await expectNoError("إنشاء فاتورة آجلة", deferred);
    assert.equal((deferred.data as Record<string, unknown>).initial_receipt, null);

    const partial = await create(ids.partial, customerNames[0], "partial", 250, "bank_transfer");
    await expectNoError("إنشاء فاتورة بدفعة جزئية", partial);
    const partialReceipt = (partial.data as { initial_receipt: Record<string, unknown> }).initial_receipt;
    assert.equal(Number(partialReceipt.amount), 250);
    assert.equal(partialReceipt.source, "invoice_initial_payment");
    assert.ok(partialReceipt.customer_id);

    const partialRetry = await create(ids.partial, customerNames[0], "partial", 250, "bank_transfer");
    await expectNoError("إعادة طلب الفاتورة الجزئية", partialRetry);
    const partialReceiptCount = await client.from("customer_receipts").select("id", { count: "exact", head: true }).eq("source_invoice_id", ids.partial);
    await expectNoError("عد سندات الدفعة الجزئية", partialReceiptCount);
    assert.equal(partialReceiptCount.count, 1);

    const paid = await create(ids.paidUnnamed, "", "paid", undefined, "cash");
    await expectNoError("إنشاء فاتورة بلا اسم عميل ومدفوعة بالكامل", paid);
    const paidReceipt = (paid.data as { initial_receipt: Record<string, unknown> }).initial_receipt;
    assert.equal(Number(paidReceipt.amount), 1000);
    assert.equal(paidReceipt.customer_id, null);
    assert.equal(paidReceipt.customer_name_snapshot, "عميل نقدي");

    const cashCustomerAfter = await client.from("customers").select("id", { count: "exact", head: true }).eq("normalized_name", "عميل نقدي");
    await expectNoError("عد العملاء النقديين بعد الاختبار", cashCustomerAfter);
    assert.equal(cashCustomerAfter.count, cashCustomerBefore.count);

    for (const [label, amount] of [["صفر", 0], ["يساوي الإجمالي", 1000], ["أكبر من الإجمالي", 1200]] as const) {
      const invalid = await create(ids.invalid, `عميل غير صالح ${runId}`, "partial", amount);
      assert.ok(invalid.error, `يجب رفض المبلغ الجزئي: ${label}`);
    }
    const invalidInvoice = await client.from("invoices").select("id", { count: "exact", head: true }).eq("id", ids.invalid);
    await expectNoError("فحص rollback للمبالغ غير الصالحة", invalidInvoice);
    assert.equal(invalidInvoice.count, 0);

    const rollback = await create(ids.rollback, `عميل rollback ${runId}`, "partial", 100, "invalid_method");
    assert.ok(rollback.error, "يجب أن يفشل إنشاء السند ذي طريقة الدفع غير الصالحة");
    const rollbackInvoice = await client.from("invoices").select("id", { count: "exact", head: true }).eq("id", ids.rollback);
    await expectNoError("فحص rollback عند فشل السند", rollbackInvoice);
    assert.equal(rollbackInvoice.count, 0);

    const updatedDimensions = [{
      ...(itemPayload(items[ids.none], pressure) as Json[])[0] as Record<string, Json | undefined>,
      heightCm: 11,
      widthCm: 22,
      lengthCm: 333,
    }] as Json;
    await expectNoError("تعديل قياسات الفاتورة", await client.rpc("update_invoice_with_items", {
      p_id: ids.none,
      p_invoice: invoicePayload(ids.none, `TEST-${runId}-none-${ids.none.slice(0, 4)}`, customerNames[2]),
      p_items: updatedDimensions,
    }));
    const dimensionsAfterUpdate = await client.from("invoice_items").select("height_cm,width_cm,length_cm").eq("invoice_id", ids.none).single();
    await expectNoError("قراءة القياسات بعد التعديل", dimensionsAfterUpdate);
    assert.deepEqual(
      [Number(dimensionsAfterUpdate.data?.height_cm), Number(dimensionsAfterUpdate.data?.width_cm), Number(dimensionsAfterUpdate.data?.length_cm)],
      [11, 22, 333],
    );

    const tooSmall = await client.rpc("update_invoice_with_items", {
      p_id: ids.partial,
      p_invoice: invoicePayload(ids.partial, `TEST-${runId}-partial-${ids.partial.slice(0, 4)}`, customerNames[0]),
      p_items: itemPayload(items[ids.partial], pressure, 100),
    });
    assert.ok(tooSmall.error, "يجب رفض خفض إجمالي الفاتورة تحت سنداتها المرتبطة");
    const partialInvoice = await client.from("invoices").select("invoice_total").eq("id", ids.partial).single();
    await expectNoError("قراءة الفاتورة بعد رفض التعديل", partialInvoice);
    assert.equal(Number(partialInvoice.data?.invoice_total), 1000);

    console.log("✓ نجح اختبار Supabase الحي: الحالات الأربع، القياسات، الدفعة بلا عميل، الذرية، rollback، منع التكرار، ومنع التحصيل الزائد.");
  } catch (error) {
    operationError = error;
  } finally {
    try {
      await cleanup(client, pressureId, invoiceIds, customerNames);
      console.log("✓ تم تنظيف جميع بيانات اختبار Supabase وسجلات التدقيق المرتبطة بها.");
    } catch (cleanupError) {
      if (operationError) {
        throw new Error(`${operationError instanceof Error ? operationError.message : operationError} | ${cleanupError instanceof Error ? cleanupError.message : cleanupError}`);
      }
      throw cleanupError;
    }
  }
  if (operationError) throw operationError;
}

function safeErrorMessage(error: unknown): string {
  let message = error instanceof Error ? error.message : "خطأ غير معروف";
  for (const secret of [process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_URL]) {
    if (secret) message = message.replaceAll(secret, "[محجوب]");
  }
  return message;
}

void main().catch((error) => {
  console.error(`✗ فشل اختبار Supabase الحي: ${safeErrorMessage(error)}`);
  process.exitCode = 1;
});
