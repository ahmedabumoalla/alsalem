import type { Invoice } from "@/lib/types/invoice";
import type { CustomerReceipt } from "@/lib/types/receipt";
import { roundMoney } from "@/lib/utils/invoice-calculations";
import { hasRecordedCustomerName } from "@/lib/utils/invoice-report";
import { normalizePhone } from "@/lib/utils/contact";

export function normalizeCustomerName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export interface CustomerBalance {
  customerName: string;
  invoiceCount: number;
  totalSales: number;
  totalReceipts: number;
  balance: number;
  lastInvoiceDate?: string;
  lastReceiptDate?: string;
  customerPhone?: string;
}

export function calculateCustomerBalances(
  invoices: Invoice[],
  receipts: CustomerReceipt[]
): CustomerBalance[] {
  const map = new Map<string, CustomerBalance>();
  const ensure = (rawName: string) => {
    const customerName = normalizeCustomerName(rawName);
    const existing = map.get(customerName);
    if (existing) return existing;
    const created: CustomerBalance = { customerName, invoiceCount: 0, totalSales: 0, totalReceipts: 0, balance: 0 };
    map.set(customerName, created); return created;
  };
  const phoneDates = new Map<string, string>();
  invoices.forEach((invoice) => {
    if (!hasRecordedCustomerName(invoice.customerName)) return;
    const row = ensure(invoice.customerName); row.invoiceCount += 1;
    row.totalSales = roundMoney(row.totalSales + invoice.invoiceTotal);
    if (!row.lastInvoiceDate || invoice.invoiceDate > row.lastInvoiceDate) row.lastInvoiceDate = invoice.invoiceDate;
    const phone = normalizePhone(invoice.customerPhone ?? "");
    const phoneDate = `${invoice.invoiceDate}|${invoice.updatedAt}`;
    if (phone && (!phoneDates.has(row.customerName) || phoneDate > (phoneDates.get(row.customerName) ?? ""))) {
      row.customerPhone = phone;
      phoneDates.set(row.customerName, phoneDate);
    }
  });
  receipts.forEach((receipt) => {
    const row = map.get(normalizeCustomerName(receipt.customerName));
    if (!row) return;
    row.totalReceipts = roundMoney(row.totalReceipts + receipt.amount);
    if (!row.lastReceiptDate || receipt.date > row.lastReceiptDate) row.lastReceiptDate = receipt.date;
  });
  map.forEach((row) => { row.balance = roundMoney(row.totalSales - row.totalReceipts); });
  return [...map.values()].sort((a, b) => b.balance - a.balance || a.customerName.localeCompare(b.customerName, "ar"));
}

export function getCustomerBalance(customerName: string, invoices: Invoice[], receipts: CustomerReceipt[]): number {
  return calculateCustomerBalances(invoices, receipts).find((row) => row.customerName === normalizeCustomerName(customerName))?.balance ?? 0;
}

export function getCustomerInvoices(customerName: string, invoices: Invoice[]): Invoice[] {
  const normalized = normalizeCustomerName(customerName);
  if (!hasRecordedCustomerName(normalized)) return [];
  return invoices
    .filter((invoice) => normalizeCustomerName(invoice.customerName) === normalized)
    .sort((left, right) => right.invoiceDate.localeCompare(left.invoiceDate));
}

export function getCustomerReceipts(customerName: string, receipts: CustomerReceipt[]): CustomerReceipt[] {
  const normalized = normalizeCustomerName(customerName);
  if (!hasRecordedCustomerName(normalized)) return [];
  return receipts
    .filter((receipt) => normalizeCustomerName(receipt.customerName) === normalized)
    .sort((left, right) => right.date.localeCompare(left.date));
}

export function validateReceiptAmount(amount: number, availableBalance: number): string | undefined {
  if (!Number.isFinite(amount) || amount <= 0) return "مبلغ السند يجب أن يكون رقمًا منتهيًا وأكبر من صفر";
  if (amount > availableBalance) return "مبلغ السند لا يمكن أن يتجاوز مديونية العميل";
}

export interface AccountStatementEntry {
  id: string;
  date: string;
  type: "invoice" | "receipt";
  reference: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export function buildCustomerStatement(customerName: string, invoices: Invoice[], receipts: CustomerReceipt[]): AccountStatementEntry[] {
  const normalized = normalizeCustomerName(customerName);
  const entries = [
    ...invoices.filter((i) => normalizeCustomerName(i.customerName) === normalized).map((i) => ({ id: i.id, date: i.invoiceDate, type: "invoice" as const, reference: i.invoiceNumber, debit: i.invoiceTotal, credit: 0, createdAt: i.createdAt })),
    ...receipts.filter((r) => normalizeCustomerName(r.customerName) === normalized).map((r) => ({ id: r.id, date: r.date, type: "receipt" as const, reference: r.receiptNumber, debit: 0, credit: r.amount, createdAt: r.createdAt })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  let runningBalance = 0;
  return entries.map((entryWithTimestamp) => {
    const entry = {
      id: entryWithTimestamp.id,
      date: entryWithTimestamp.date,
      type: entryWithTimestamp.type,
      reference: entryWithTimestamp.reference,
      debit: entryWithTimestamp.debit,
      credit: entryWithTimestamp.credit,
    };
    runningBalance = roundMoney(runningBalance + entry.debit - entry.credit);
    return { ...entry, runningBalance };
  });
}
