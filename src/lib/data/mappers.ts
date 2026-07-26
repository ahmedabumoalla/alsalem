import type { Invoice, InvoiceItem } from "@/lib/types/invoice";
import type { FoamPressureCost } from "@/lib/types/pressure-cost";
import type { CustomerReceipt } from "@/lib/types/receipt";
import type { Lead } from "@/lib/types/lead";
import type {
  InvoiceItemRow,
  InvoiceRow,
  LeadRow,
  PressureCostRow,
  ReceiptRow,
} from "@/lib/supabase/database";

export interface InvoiceJoinedRow extends InvoiceRow {
  invoice_items: InvoiceItemRow[];
}

export function mapInvoiceItem(row: InvoiceItemRow): InvoiceItem {
  return {
    id: row.id,
    lengthCm: Number(row.length_cm),
    widthCm: Number(row.width_cm),
    heightCm: Number(row.height_cm),
    densityPressure: Number(row.density_pressure),
    quantity: Number(row.quantity),
    unitSalePrice: Number(row.unit_sale_price),
    unitCost: Number(row.unit_cost),
    costSource: row.cost_source,
    productSubtotal: Number(row.product_subtotal),
    totalCost: Number(row.total_cost),
    netProfit: Number(row.net_profit),
    weightKg: row.weight_kg == null ? undefined : Number(row.weight_kg),
  };
}

export function mapInvoice(row: InvoiceJoinedRow): Invoice {
  return {
    schemaVersion: 3,
    id: row.id,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    deliveryDate: row.delivery_date ?? row.invoice_date,
    sellerName: row.seller_name_snapshot,
    customerName: row.customer_name_snapshot,
    customerPhone: row.customer_phone_snapshot ?? undefined,
    items: row.invoice_items.map(mapInvoiceItem),
    deliveryFee: Number(row.delivery_fee),
    notes: row.notes ?? undefined,
    productSubtotal: Number(row.subtotal),
    invoiceTotal: Number(row.invoice_total),
    totalCost: Number(row.total_cost),
    netProfit: Number(row.net_profit),
    profitMargin: Number(row.profit_margin),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPressureCost(row: PressureCostRow): FoamPressureCost {
  return {
    id: row.id,
    pressure: Number(row.pressure),
    standardBlockCost: Number(row.standard_block_cost),
    standardLengthCm: Number(row.standard_length_cm),
    standardWidthCm: Number(row.standard_width_cm),
    standardHeightCm: Number(row.standard_height_cm),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapReceipt(row: ReceiptRow): CustomerReceipt {
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    customerName: row.customer_name_snapshot,
    date: row.date,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    reference: row.reference_number ?? undefined,
    notes: row.notes ?? undefined,
    source:
      row.source === "legacy_invoice_payment" || row.source === "invoice_initial_payment"
        ? row.source
        : undefined,
    sourceInvoiceId: row.source_invoice_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    source: row.source,
    customSource: row.custom_source ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
