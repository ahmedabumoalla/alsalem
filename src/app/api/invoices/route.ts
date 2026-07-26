import { createInvoiceRecord, listInvoices } from "@/lib/data/invoices-repository";
import { parseCreateInvoiceInput } from "@/lib/api/validation";
import { jsonData, jsonError, readJson } from "@/lib/api/route-utils";
import { requireAuthorizedApiUser } from "@/lib/auth/require-authorized-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAuthorizedApiUser(); if (denied) return denied;
  try { return jsonData(await listInvoices()); } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  const denied = await requireAuthorizedApiUser(); if (denied) return denied;
  try {
    const { invoice, initialPayment } = parseCreateInvoiceInput(await readJson(request));
    return jsonData(await createInvoiceRecord(invoice, initialPayment), 201);
  } catch (error) {
    return jsonError(error);
  }
}
