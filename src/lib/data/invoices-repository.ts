import "server-only";

import type { Invoice } from "@/lib/types/invoice";
import type { Json } from "@/lib/supabase/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toDataAccessError } from "@/lib/data/errors";
import { mapInvoice, type InvoiceJoinedRow } from "@/lib/data/mappers";

const INVOICE_SELECT = "*, invoice_items(*)";

export async function listInvoices(includeDeleted = false): Promise<Invoice[]> {
  const client = getSupabaseServerClient();
  let query = client.from("invoices").select(INVOICE_SELECT).order("invoice_date", { ascending: false }).order("created_at", { ascending: false });
  if (!includeDeleted) query = query.is("deleted_at", null);
  const { data, error } = await query;
  if (error) throw toDataAccessError(error, "تعذر تحميل الفواتير.");
  return (data as unknown as InvoiceJoinedRow[]).map(mapInvoice);
}

export async function getInvoice(id: string, includeDeleted = false): Promise<Invoice | undefined> {
  const client = getSupabaseServerClient();
  let query = client.from("invoices").select(INVOICE_SELECT).eq("id", id);
  if (!includeDeleted) query = query.is("deleted_at", null);
  const { data, error } = await query.maybeSingle();
  if (error) throw toDataAccessError(error, "تعذر تحميل الفاتورة.");
  return data ? mapInvoice(data as unknown as InvoiceJoinedRow) : undefined;
}

function invoiceRpcPayload(invoice: Invoice): { p_invoice: Json; p_items: Json } {
  return {
    p_invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      deliveryDate: invoice.deliveryDate,
      sellerName: invoice.sellerName,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      deliveryFee: invoice.deliveryFee,
      notes: invoice.notes,
      schemaVersion: invoice.schemaVersion,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    },
    p_items: invoice.items.map((item) => ({
      id: item.id,
      lengthCm: item.lengthCm,
      widthCm: item.widthCm,
      heightCm: item.heightCm,
      densityPressure: item.densityPressure,
      quantity: item.quantity,
      unitSalePrice: item.unitSalePrice,
      unitCost: item.unitCost,
      costSource: item.costSource,
      weightKg: item.weightKg,
    })),
  };
}

export async function createInvoiceRecord(invoice: Invoice): Promise<Invoice> {
  const client = getSupabaseServerClient();
  const { data, error } = await client.rpc("create_invoice_with_items", invoiceRpcPayload(invoice));
  if (error) throw toDataAccessError(error, "تعذر إنشاء الفاتورة.");
  return mapInvoice(data as unknown as InvoiceJoinedRow);
}

export async function updateInvoiceRecord(id: string, invoice: Invoice): Promise<Invoice> {
  const client = getSupabaseServerClient();
  const payload = invoiceRpcPayload(invoice);
  const { error } = await client.rpc("update_invoice_with_items", { p_id: id, ...payload });
  if (error) throw toDataAccessError(error, "تعذر تحديث الفاتورة.");
  const updated = await getInvoice(id);
  if (!updated) throw new Error("تم تحديث الفاتورة لكن تعذر استرجاعها.");
  return updated;
}

export async function softDeleteInvoiceRecord(id: string): Promise<void> {
  const { error } = await getSupabaseServerClient().rpc("soft_delete_invoice", { p_id: id });
  if (error) throw toDataAccessError(error, "تعذر حذف الفاتورة.");
}

export async function restoreInvoiceRecord(id: string): Promise<Invoice> {
  const { error } = await getSupabaseServerClient().rpc("restore_invoice", { p_id: id });
  if (error) throw toDataAccessError(error, "تعذر استرجاع الفاتورة.");
  const restored = await getInvoice(id);
  if (!restored) throw new Error("تم استرجاع الفاتورة لكن تعذر تحميلها.");
  return restored;
}

export async function findInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
  const { data, error } = await getSupabaseServerClient().from("invoices").select(INVOICE_SELECT).eq("invoice_number", invoiceNumber).maybeSingle();
  if (error) throw toDataAccessError(error, "تعذر التحقق من رقم الفاتورة.");
  return data ? mapInvoice(data as unknown as InvoiceJoinedRow) : undefined;
}
