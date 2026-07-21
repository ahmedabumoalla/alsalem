import type { CustomerReceipt } from "@/lib/types/receipt";
import { RECEIPTS_STORAGE_KEY } from "@/lib/types/receipt";
import type { Invoice } from "@/lib/types/invoice";
import { notifyStorageKey, subscribeStorageKey } from "@/lib/storage/storage-events";
import { mergeLegacyPaymentReceipts } from "@/lib/utils/receipt-migration";

const EMPTY: CustomerReceipt[] = [];
let cachedRaw: string | null | undefined;
let cached: CustomerReceipt[] = EMPTY;

function parse(raw: string | null): CustomerReceipt[] {
  try { const value: unknown = raw ? JSON.parse(raw) : []; return Array.isArray(value) ? value as CustomerReceipt[] : EMPTY; }
  catch { return EMPTY; }
}

export function getReceiptsSnapshot(): CustomerReceipt[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = localStorage.getItem(RECEIPTS_STORAGE_KEY);
  if (raw === cachedRaw) return cached;
  cachedRaw = raw; cached = parse(raw); return cached;
}
export function getServerReceiptsSnapshot(): CustomerReceipt[] { return EMPTY; }
export function subscribeReceipts(listener: () => void): () => void { return subscribeStorageKey(RECEIPTS_STORAGE_KEY, listener); }
function write(items: CustomerReceipt[]): void { localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(items)); cachedRaw = undefined; notifyStorageKey(RECEIPTS_STORAGE_KEY); }
export function migrateLegacyReceipts(invoices: Invoice[]): void {
  if (typeof window === "undefined") return;
  const current = getReceiptsSnapshot(); const merged = mergeLegacyPaymentReceipts(current, invoices);
  if (merged.length !== current.length) write(merged);
}
export function createReceipt(receipt: CustomerReceipt): void {
  const current = getReceiptsSnapshot();
  if (current.some((item) => item.receiptNumber === receipt.receiptNumber)) throw new Error("رقم سند القبض مستخدم مسبقًا");
  write([...current, receipt]);
}
export function updateReceipt(id: string, receipt: CustomerReceipt): void {
  const current = getReceiptsSnapshot();
  if (current.some((item) => item.id !== id && item.receiptNumber === receipt.receiptNumber)) throw new Error("رقم سند القبض مستخدم مسبقًا");
  write(current.map((item) => item.id === id ? receipt : item));
}
export function deleteReceipt(id: string): void { write(getReceiptsSnapshot().filter((item) => item.id !== id)); }
