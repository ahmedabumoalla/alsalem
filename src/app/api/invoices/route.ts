import { createInvoiceRecord, listInvoices } from "@/lib/data/invoices-repository";
import { parseInvoiceInput } from "@/lib/api/validation";
import { jsonData, jsonError, readJson } from "@/lib/api/route-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try { return jsonData(await listInvoices()); } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try { return jsonData(await createInvoiceRecord(parseInvoiceInput(await readJson(request))), 201); } catch (error) { return jsonError(error); }
}
