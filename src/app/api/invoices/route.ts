import { createInvoiceRecord, listInvoices } from "@/lib/data/invoices-repository";
import { parseCreateInvoiceInput } from "@/lib/api/validation";
import { jsonData, jsonError, readJson } from "@/lib/api/route-utils";
import { requireAuthorizedApiUser } from "@/lib/auth/require-authorized-user";
import { isValidReportDate } from "@/lib/utils/report-date-range";

export const dynamic = "force-dynamic";

function readDate(searchParams: URLSearchParams, key: "dateFrom" | "dateTo") {
  const value = searchParams.get(key)?.trim();
  if (!value) return undefined;
  if (!isValidReportDate(value)) throw new Error("نطاق التاريخ المطلوب غير صالح.");
  return value;
}

export async function GET(request: Request) {
  const denied = await requireAuthorizedApiUser(); if (denied) return denied;
  try {
    const searchParams = new URL(request.url).searchParams;
    const dateFrom = readDate(searchParams, "dateFrom");
    const dateTo = readDate(searchParams, "dateTo");
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new Error("تاريخ البداية يجب ألا يتجاوز تاريخ النهاية.");
    }
    return jsonData(await listInvoices({ dateFrom, dateTo }));
  } catch (error) { return jsonError(error); }
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
