import { getInvoice, softDeleteInvoiceRecord, updateInvoiceRecord } from "@/lib/data/invoices-repository";
import { parseInvoiceInput } from "@/lib/api/validation";
import { jsonData, jsonError, readJson } from "@/lib/api/route-utils";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try { const { id } = await context.params; const invoice = await getInvoice(id); return invoice ? jsonData(invoice) : jsonError(new Error("الفاتورة غير موجودة.")); } catch (error) { return jsonError(error); }
}
export async function PUT(request: Request, context: Context) {
  try { const { id } = await context.params; return jsonData(await updateInvoiceRecord(id, parseInvoiceInput(await readJson(request)))); } catch (error) { return jsonError(error); }
}
export async function DELETE(_request: Request, context: Context) {
  try { const { id } = await context.params; await softDeleteInvoiceRecord(id); return jsonData({ deleted: true }); } catch (error) { return jsonError(error); }
}
