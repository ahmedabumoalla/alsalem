export type ReceiptPaymentMethod = "cash" | "bank_transfer" | "other";

export interface CustomerReceipt {
  id: string;
  receiptNumber: string;
  customerName: string;
  date: string;
  amount: number;
  paymentMethod: ReceiptPaymentMethod;
  reference?: string;
  notes?: string;
  source?: "legacy_invoice_payment" | "invoice_initial_payment";
  sourceInvoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export const RECEIPTS_STORAGE_KEY = "foam_sales_customer_receipts";
