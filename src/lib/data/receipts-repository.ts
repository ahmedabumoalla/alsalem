import "server-only";

import type { CustomerReceipt } from "@/lib/types/receipt";
import type { Json, ReceiptRow } from "@/lib/supabase/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toDataAccessError } from "@/lib/data/errors";
import { mapReceipt } from "@/lib/data/mappers";

function receiptPayload(receipt: CustomerReceipt): Json {
  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    customerName: receipt.customerName,
    date: receipt.date,
    amount: receipt.amount,
    paymentMethod: receipt.paymentMethod,
    reference: receipt.reference,
    notes: receipt.notes,
    source: receipt.source ?? "manual",
    sourceInvoiceId: receipt.sourceInvoiceId,
    createdAt: receipt.createdAt,
    updatedAt: receipt.updatedAt,
  };
}

export async function listReceipts(includeDeleted = false): Promise<CustomerReceipt[]> {
  const client = getSupabaseServerClient();
  let query = client.from("customer_receipts").select("*").order("date", { ascending: false }).order("created_at", { ascending: false });
  if (!includeDeleted) query = query.is("deleted_at", null);
  const { data, error } = await query;
  if (error) throw toDataAccessError(error, "تعذر تحميل سندات القبض.");
  return data.map(mapReceipt);
}

export async function createReceiptRecord(receipt: CustomerReceipt): Promise<CustomerReceipt> {
  const { data, error } = await getSupabaseServerClient().rpc("create_customer_receipt", { p_receipt: receiptPayload(receipt) });
  if (error) throw toDataAccessError(error, "تعذر إنشاء سند القبض.");
  return mapReceipt(data as unknown as ReceiptRow);
}

export async function updateReceiptRecord(id: string, receipt: CustomerReceipt): Promise<CustomerReceipt> {
  const { data, error } = await getSupabaseServerClient().rpc("update_customer_receipt", { p_id: id, p_receipt: receiptPayload(receipt) });
  if (error) throw toDataAccessError(error, "تعذر تحديث سند القبض.");
  return mapReceipt(data as unknown as ReceiptRow);
}

export async function softDeleteReceiptRecord(id: string): Promise<void> {
  const { error } = await getSupabaseServerClient().rpc("soft_delete_customer_receipt", { p_id: id });
  if (error) throw toDataAccessError(error, "تعذر حذف سند القبض.");
}

export async function restoreReceiptRecord(id: string): Promise<void> {
  const { error } = await getSupabaseServerClient().rpc("restore_customer_receipt", { p_id: id });
  if (error) throw toDataAccessError(error, "تعذر استرجاع سند القبض.");
}

export async function findReceiptByNumber(receiptNumber: string): Promise<CustomerReceipt | undefined> {
  const { data, error } = await getSupabaseServerClient().from("customer_receipts").select("*").eq("receipt_number", receiptNumber).maybeSingle();
  if (error) throw toDataAccessError(error, "تعذر التحقق من رقم سند القبض.");
  return data ? mapReceipt(data) : undefined;
}
