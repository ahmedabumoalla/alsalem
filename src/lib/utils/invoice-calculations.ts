import type { CostSource, InvoiceItem } from "@/lib/types/invoice";

export const STANDARD_BLOCK_HEIGHT_CM = 100;
export const STANDARD_BLOCK_WIDTH_CM = 120;
export const STANDARD_BLOCK_LENGTH_CM = 400;
export const STANDARD_BLOCK_VOLUME_CM3 =
  STANDARD_BLOCK_HEIGHT_CM *
  STANDARD_BLOCK_WIDTH_CM *
  STANDARD_BLOCK_LENGTH_CM;
export const MISSING_PRESSURE_COST_MESSAGE =
  "لم يتم تحديد تكلفة الضغط المختار في مركز التكلفة";

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateUnitCost(
  standardBlockCost: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number
): number {
  const values = [standardBlockCost, lengthCm, widthCm, heightCm];
  if (!values.every(Number.isFinite) || standardBlockCost < 0) {
    throw new Error("قيم حساب التكلفة غير صالحة");
  }
  if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) {
    throw new Error("أبعاد الصنف يجب أن تكون أكبر من صفر");
  }
  const countByHeight = Math.floor(STANDARD_BLOCK_HEIGHT_CM / heightCm);
  const countByWidth = Math.floor(STANDARD_BLOCK_WIDTH_CM / widthCm);
  const countByLength = Math.floor(STANDARD_BLOCK_LENGTH_CM / lengthCm);
  const totalPiecesPerBlock = countByHeight * countByWidth * countByLength;
  if (totalPiecesPerBlock === 0) {
    throw new Error(
      "أبعاد الصنف يجب ألا تتجاوز البلك القياسي 100×120×400 سم"
    );
  }
  return roundMoney(standardBlockCost / totalPiecesPerBlock);
}

export function calculateInvoiceItem(input: {
  id: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  densityPressure: number;
  quantity: number;
  unitSalePrice: number;
  standardBlockCost: number;
  unitCost?: number;
  costSource?: CostSource;
  weightKg?: number;
}): InvoiceItem {
  const automaticUnitCost = calculateUnitCost(
    input.standardBlockCost,
    input.lengthCm,
    input.widthCm,
    input.heightCm
  );
  const costSource = input.costSource ?? "auto";
  const unitCost = costSource === "manual" ? input.unitCost : automaticUnitCost;
  if (unitCost === undefined || !Number.isFinite(unitCost) || unitCost < 0) {
    throw new Error("تكلفة الوحدة يجب أن تكون رقمًا منتهيًا وصفرًا أو أكثر");
  }
  const productSubtotal = roundMoney(input.unitSalePrice * input.quantity);
  const totalCost = roundMoney(unitCost * input.quantity);
  return {
    ...input,
    unitCost,
    costSource,
    productSubtotal,
    totalCost,
    netProfit: roundMoney(productSubtotal - totalCost),
  };
}

export interface InvoiceCalculationResult {
  productSubtotal: number;
  invoiceTotal: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;
}

export function calculateInvoiceTotals(
  items: Pick<InvoiceItem, "productSubtotal" | "totalCost">[],
  deliveryFee: number
): InvoiceCalculationResult {
  const productSubtotal = roundMoney(
    items.reduce((sum, item) => sum + item.productSubtotal, 0)
  );
  const totalCost = roundMoney(
    items.reduce((sum, item) => sum + item.totalCost, 0)
  );
  const invoiceTotal = roundMoney(productSubtotal + deliveryFee);
  const netProfit = roundMoney(invoiceTotal - totalCost);
  const profitMargin =
    invoiceTotal > 0 ? roundMoney((netProfit / invoiceTotal) * 100) : 0;
  return { productSubtotal, invoiceTotal, totalCost, netProfit, profitMargin };
}
