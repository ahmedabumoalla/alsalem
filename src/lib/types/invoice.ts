export type PaymentStatus = "paid" | "partial" | "deferred";
export type PaymentMethod = "cash" | "bank_transfer";
export type LegacyPaymentMethod = PaymentMethod | "credit";
export type CostSource = "auto" | "manual";

export interface InvoiceItem {
  id: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  densityPressure: number;
  quantity: number;
  unitSalePrice: number;
  unitCost: number;
  costSource: CostSource;
  productSubtotal: number;
  totalCost: number;
  netProfit: number;
  weightKg?: number;
}

export interface Invoice {
  schemaVersion: 3;
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  deliveryDate: string;
  sellerName: string;
  customerName: string;
  customerPhone?: string;
  items: InvoiceItem[];
  deliveryFee: number;
  notes?: string;
  productSubtotal: number;
  invoiceTotal: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;
  createdAt: string;
  updatedAt: string;
  /** حقول قديمة محفوظة للترحيل فقط، ولا تدخل في الحسابات الجديدة. */
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  amountPaid?: number;
  amountDue?: number;
  transferReceipt?: string;
  lengthCm?: number;
  widthCm?: number;
  thicknessCm?: number;
  densityPressure?: number;
  weightKg?: number;
  unitSalePrice?: number;
  unitCost?: number;
  quantity?: number;
}

export const INVOICE_SCHEMA_VERSION = 3;
export const INVOICES_STORAGE_KEY = "foam_sales_invoices";
export const INVOICES_BACKUP_KEY = "foam_sales_invoices_backup_v1";
