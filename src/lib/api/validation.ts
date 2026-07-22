import type {
  CreateInvoiceInput,
  InitialPaymentInstruction,
  Invoice,
} from "@/lib/types/invoice";
import type { FoamPressureCost } from "@/lib/types/pressure-cost";
import type { CustomerReceipt } from "@/lib/types/receipt";
import type { Lead } from "@/lib/types/lead";
import type { LeadSource, LeadStatus } from "@/lib/types/lead";
import { normalizeInvoices } from "@/lib/utils/invoice-normalize";
import { normalizeLead, validateLead } from "@/lib/utils/leads";
import { isValidOptionalPhone, normalizePhone } from "@/lib/utils/contact";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseInvoiceInput(value: unknown): Invoice {
  if (!isRecord(value)) throw new Error("بيانات الفاتورة غير صالحة.");
  const invoice = normalizeInvoices([value])[0];
  if (!invoice || !invoice.id || !invoice.invoiceNumber.trim()) throw new Error("معرف الفاتورة ورقمها مطلوبان.");
  if (!invoice.invoiceDate || !invoice.deliveryDate) throw new Error("تاريخا الفاتورة والتسليم مطلوبان.");
  if (invoice.deliveryDate < invoice.invoiceDate) throw new Error("تاريخ التسليم لا يمكن أن يسبق تاريخ الفاتورة.");
  if (!invoice.sellerName.trim()) throw new Error("اسم البائع مطلوب.");
  if (!isValidOptionalPhone(invoice.customerPhone ?? "")) throw new Error("رقم تواصل العميل غير صالح.");
  if (!Number.isFinite(invoice.deliveryFee) || invoice.deliveryFee < 0) throw new Error("رسوم التوصيل غير صالحة.");
  if (!invoice.items.length) throw new Error("يجب إضافة صنف واحد على الأقل.");
  invoice.items.forEach((item, index) => {
    const positive = [item.lengthCm, item.widthCm, item.heightCm, item.densityPressure, item.quantity];
    if (!positive.every((number) => Number.isFinite(number) && number > 0)) throw new Error(`بيانات الصنف ${index + 1} غير صالحة.`);
    if (!Number.isInteger(item.quantity)) throw new Error(`كمية الصنف ${index + 1} يجب أن تكون عددًا صحيحًا.`);
    if (![item.unitSalePrice, item.unitCost].every((number) => Number.isFinite(number) && number >= 0)) throw new Error(`أسعار الصنف ${index + 1} غير صالحة.`);
  });
  return { ...invoice, customerPhone: normalizePhone(invoice.customerPhone ?? "") || undefined };
}

function parseInitialPaymentInput(
  value: unknown,
  invoiceTotal: number,
): InitialPaymentInstruction {
  if (!isRecord(value)) return { mode: "none" };
  const mode = value.mode;
  if (!["none", "deferred", "partial", "paid"].includes(String(mode))) {
    throw new Error("خيار الدفعة الأولية غير صالح.");
  }
  const normalizedMode = String(mode) as InitialPaymentInstruction["mode"];
  const paymentMethod = String(value.paymentMethod ?? "cash");
  if (!["cash", "bank_transfer", "other"].includes(paymentMethod)) {
    throw new Error("طريقة الدفع غير صالحة.");
  }
  const normalizedPaymentMethod = paymentMethod as NonNullable<
    InitialPaymentInstruction["paymentMethod"]
  >;
  const reference =
    typeof value.reference === "string" ? value.reference.trim() || undefined : undefined;
  if (normalizedMode === "none" || normalizedMode === "deferred") {
    return { mode: normalizedMode };
  }
  if (normalizedMode === "paid") {
    if (!Number.isFinite(invoiceTotal) || invoiceTotal <= 0) {
      throw new Error("إجمالي الفاتورة يجب أن يكون أكبر من صفر لتسجيل السداد الكامل.");
    }
    return {
      mode: normalizedMode,
      amount: invoiceTotal,
      paymentMethod: normalizedPaymentMethod,
      reference,
    };
  }
  const amount = Number(value.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("أدخل مبلغًا أكبر من صفر");
  }
  if (amount >= invoiceTotal) {
    throw new Error("المبلغ الجزئي يجب أن يكون أقل من إجمالي الفاتورة");
  }
  return {
    mode: normalizedMode,
    amount,
    paymentMethod: normalizedPaymentMethod,
    reference,
  };
}

export function parseCreateInvoiceInput(value: unknown): CreateInvoiceInput {
  const wrapped = isRecord(value) && "invoice" in value;
  const invoice = parseInvoiceInput(wrapped ? value.invoice : value);
  const initialPayment = parseInitialPaymentInput(
    wrapped && isRecord(value) ? value.initialPayment : undefined,
    invoice.invoiceTotal,
  );
  return { invoice, initialPayment };
}

export function parsePressureCostInput(value: unknown): FoamPressureCost {
  if (!isRecord(value)) throw new Error("بيانات تكلفة الضغط غير صالحة.");
  const item: FoamPressureCost = {
    id: typeof value.id === "string" ? value.id : "",
    pressure: Number(value.pressure),
    standardBlockCost: Number(value.standardBlockCost),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
  };
  if (!item.id) throw new Error("معرف تكلفة الضغط مطلوب.");
  if (!Number.isFinite(item.pressure) || item.pressure <= 0) throw new Error("الضغط يجب أن يكون رقمًا أكبر من صفر.");
  if (!Number.isFinite(item.standardBlockCost) || item.standardBlockCost < 0) throw new Error("التكلفة يجب أن تكون صفرًا أو أكثر.");
  return item;
}

export function parseReceiptInput(value: unknown): CustomerReceipt {
  if (!isRecord(value)) throw new Error("بيانات سند القبض غير صالحة.");
  const paymentMethod = value.paymentMethod;
  if (paymentMethod !== "cash" && paymentMethod !== "bank_transfer" && paymentMethod !== "other") throw new Error("طريقة الدفع غير صالحة.");
  const source =
    value.source === "legacy_invoice_payment" || value.source === "invoice_initial_payment"
      ? value.source
      : undefined;
  const receipt: CustomerReceipt = {
    id: typeof value.id === "string" ? value.id : "",
    receiptNumber: typeof value.receiptNumber === "string" ? value.receiptNumber.trim() : "",
    customerName: typeof value.customerName === "string" ? value.customerName.trim().replace(/\s+/g, " ") : "",
    date: typeof value.date === "string" ? value.date : "",
    amount: Number(value.amount),
    paymentMethod,
    reference: typeof value.reference === "string" ? value.reference.trim() || undefined : undefined,
    notes: typeof value.notes === "string" ? value.notes.trim() || undefined : undefined,
    source,
    sourceInvoiceId: typeof value.sourceInvoiceId === "string" ? value.sourceInvoiceId : undefined,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
  };
  if (!receipt.id || !receipt.receiptNumber || !receipt.customerName || !receipt.date) throw new Error("معرف السند ورقمه والعميل والتاريخ مطلوبة.");
  if (!Number.isFinite(receipt.amount) || receipt.amount <= 0) throw new Error("مبلغ السند يجب أن يكون أكبر من صفر.");
  if (source && !receipt.sourceInvoiceId) throw new Error("الفاتورة المصدر مطلوبة للسند القديم.");
  return receipt;
}

export function parseLeadInput(value: unknown): Lead {
  if (!isRecord(value)) throw new Error("بيانات العميل المحتمل غير صالحة.");
  const source = value.source;
  const status = value.status;
  const validSources = ["call", "whatsapp", "visit", "referral", "ad", "exhibition", "website", "other"] as const;
  const validStatuses = ["new", "contacted", "interested", "converted", "not_interested"] as const;
  if (!validSources.some((item) => item === source)) throw new Error("مصدر العميل المحتمل غير صالح.");
  if (!validStatuses.some((item) => item === status)) throw new Error("حالة العميل المحتمل غير صالحة.");
  const lead = normalizeLead({
    id: typeof value.id === "string" ? value.id : "",
    name: typeof value.name === "string" ? value.name : "",
    phone: typeof value.phone === "string" ? value.phone : "",
    source: source as LeadSource,
    customSource: typeof value.customSource === "string" ? value.customSource : undefined,
    notes: typeof value.notes === "string" ? value.notes : undefined,
    status: status as LeadStatus,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
  });
  if (!lead.id) throw new Error("معرف العميل المحتمل مطلوب.");
  const error = validateLead(lead, []);
  if (error) throw new Error(error);
  return lead;
}
