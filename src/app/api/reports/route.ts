import { listInvoices } from "@/lib/data/invoices-repository";
import { listReceipts } from "@/lib/data/receipts-repository";
import { jsonData, jsonError } from "@/lib/api/route-utils";
import { calculateCustomerBalances } from "@/lib/utils/customer-accounting";
import { calculateFinancialTotals, calculateSellerBreakdown } from "@/lib/utils/invoice-report";
import { requireAuthorizedApiUser } from "@/lib/auth/require-authorized-user";

export const dynamic = "force-dynamic";
export async function GET() {
  const denied = await requireAuthorizedApiUser(); if (denied) return denied;
  try {
    const [invoices, receipts] = await Promise.all([listInvoices(), listReceipts()]);
    return jsonData({ invoices, receipts, totals: calculateFinancialTotals(invoices), sellers: calculateSellerBreakdown(invoices), customerBalances: calculateCustomerBalances(invoices, receipts) });
  } catch (error) { return jsonError(error); }
}
