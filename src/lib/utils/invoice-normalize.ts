import type { CostSource, Invoice, InvoiceItem, PaymentMethod } from "@/lib/types/invoice";
import { INVOICE_SCHEMA_VERSION } from "@/lib/types/invoice";
import { roundMoney } from "@/lib/utils/invoice-calculations";
import { normalizePhone } from "@/lib/utils/contact";

type StoredInvoice = Partial<Invoice> & Record<string, unknown>;

function numberOr(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

type StoredInvoiceItem = Partial<InvoiceItem> & { description?: unknown };

function normalizeItem(raw: StoredInvoiceItem, fallbackId: string): InvoiceItem {
  const quantity = numberOr(raw.quantity);
  const unitSalePrice = numberOr(raw.unitSalePrice);
  const unitCost = numberOr(raw.unitCost);
  const productSubtotal = numberOr(
    raw.productSubtotal,
    roundMoney(unitSalePrice * quantity)
  );
  const totalCost = numberOr(raw.totalCost, roundMoney(unitCost * quantity));
  return {
    id: raw.id || fallbackId,
    lengthCm: numberOr(raw.lengthCm),
    widthCm: numberOr(raw.widthCm),
    heightCm: numberOr(raw.heightCm),
    densityPressure: numberOr(raw.densityPressure),
    quantity,
    unitSalePrice,
    unitCost,
    costSource: raw.costSource === "manual" ? "manual" : "auto" as CostSource,
    productSubtotal,
    totalCost,
    netProfit: numberOr(raw.netProfit, roundMoney(productSubtotal - totalCost)),
    weightKg: typeof raw.weightKg === "number" ? raw.weightKg : undefined,
  };
}

export function needsInvoiceMigration(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return true;
  const invoice = raw as StoredInvoice;
  return invoice.schemaVersion !== INVOICE_SCHEMA_VERSION || !Array.isArray(invoice.items);
}

export function normalizeInvoice(raw: StoredInvoice): Invoice {
  const id = typeof raw.id === "string" ? raw.id : "";
  const oldQuantity = numberOr(raw.quantity);
  const oldSale = numberOr(raw.unitSalePrice);
  const oldCost = numberOr(raw.unitCost);
  const legacyItem: InvoiceItem = normalizeItem(
    {
      id: `legacy-item-${id}`,
      lengthCm: numberOr(raw.lengthCm),
      widthCm: numberOr(raw.widthCm),
      heightCm: numberOr(raw.thicknessCm),
      densityPressure: numberOr(raw.densityPressure),
      quantity: oldQuantity,
      unitSalePrice: oldSale,
      unitCost: oldCost,
      productSubtotal: numberOr(raw.productSubtotal, oldSale * oldQuantity),
      totalCost: numberOr(raw.totalCost, oldCost * oldQuantity),
      netProfit: numberOr(raw.netProfit),
      weightKg: typeof raw.weightKg === "number" ? raw.weightKg : undefined,
    },
    `legacy-item-${id}`
  );
  const items = Array.isArray(raw.items)
    ? raw.items.map((item, index) => normalizeItem(item, `${id}-item-${index + 1}`))
    : [legacyItem];
  const deliveryFee = numberOr(raw.deliveryFee);
  const productSubtotal = roundMoney(items.reduce((s, item) => s + item.productSubtotal, 0));
  const totalCost = roundMoney(items.reduce((s, item) => s + item.totalCost, 0));
  const invoiceTotal = numberOr(raw.invoiceTotal, productSubtotal + deliveryFee);
  const netProfit = numberOr(raw.netProfit, invoiceTotal - totalCost);
  const paymentMethod = raw.paymentMethod;

  return {
    schemaVersion: INVOICE_SCHEMA_VERSION,
    id,
    invoiceNumber: typeof raw.invoiceNumber === "string" ? raw.invoiceNumber : "",
    invoiceDate: typeof raw.invoiceDate === "string" ? raw.invoiceDate : "",
    deliveryDate: typeof raw.deliveryDate === "string" ? raw.deliveryDate : "",
    sellerName: typeof raw.sellerName === "string" ? raw.sellerName : "",
    customerName: typeof raw.customerName === "string" ? raw.customerName : "",
    customerPhone: typeof raw.customerPhone === "string" ? normalizePhone(raw.customerPhone) || undefined : undefined,
    items,
    deliveryFee,
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
    productSubtotal,
    invoiceTotal,
    totalCost,
    netProfit,
    profitMargin: numberOr(raw.profitMargin, invoiceTotal > 0 ? (netProfit / invoiceTotal) * 100 : 0),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
    paymentStatus: raw.paymentStatus === "paid" || raw.paymentStatus === "partial" || raw.paymentStatus === "deferred" ? raw.paymentStatus : undefined,
    paymentMethod: paymentMethod === "cash" || paymentMethod === "bank_transfer" ? paymentMethod as PaymentMethod : undefined,
    amountPaid: typeof raw.amountPaid === "number" ? raw.amountPaid : paymentMethod === "cash" || paymentMethod === "bank_transfer" ? invoiceTotal : 0,
    amountDue: typeof raw.amountDue === "number" ? raw.amountDue : undefined,
    transferReceipt: typeof raw.transferReceipt === "string" ? raw.transferReceipt : undefined,
    lengthCm: typeof raw.lengthCm === "number" ? raw.lengthCm : undefined,
    widthCm: typeof raw.widthCm === "number" ? raw.widthCm : undefined,
    thicknessCm: typeof raw.thicknessCm === "number" ? raw.thicknessCm : undefined,
    densityPressure: typeof raw.densityPressure === "number" ? raw.densityPressure : undefined,
    weightKg: typeof raw.weightKg === "number" ? raw.weightKg : undefined,
    unitSalePrice: typeof raw.unitSalePrice === "number" ? raw.unitSalePrice : undefined,
    unitCost: typeof raw.unitCost === "number" ? raw.unitCost : undefined,
    quantity: typeof raw.quantity === "number" ? raw.quantity : undefined,
  };
}

export function normalizeInvoices(rawList: unknown[]): Invoice[] {
  return rawList.map((item) => normalizeInvoice(item as StoredInvoice));
}
