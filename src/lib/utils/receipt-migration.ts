import type { Invoice } from "@/lib/types/invoice";
import type { CustomerReceipt } from "@/lib/types/receipt";

export function createLegacyPaymentReceipts(invoices: Invoice[]): CustomerReceipt[] {
  return invoices.flatMap((invoice) => {
    const amount = invoice.amountPaid ?? 0;
    if (!Number.isFinite(amount) || amount <= 0) return [];
    const timestamp = invoice.updatedAt || invoice.createdAt;
    return [{
      id: `legacy-payment-${invoice.id}`,
      receiptNumber: `LEGACY-${invoice.invoiceNumber}`,
      customerName: invoice.customerName,
      date: invoice.invoiceDate,
      amount,
      paymentMethod: invoice.paymentMethod ?? "other",
      reference: invoice.invoiceNumber,
      notes: "تم ترحيله تلقائيًا من دفعة فاتورة قديمة",
      source: "legacy_invoice_payment" as const,
      sourceInvoiceId: invoice.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    }];
  });
}

export function mergeLegacyPaymentReceipts(
  existing: CustomerReceipt[],
  invoices: Invoice[]
): CustomerReceipt[] {
  const ids = new Set(existing.map((receipt) => receipt.id));
  return [
    ...existing,
    ...createLegacyPaymentReceipts(invoices).filter((receipt) => !ids.has(receipt.id)),
  ];
}
