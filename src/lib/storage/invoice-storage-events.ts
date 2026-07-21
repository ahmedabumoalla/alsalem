import { INVOICES_STORAGE_KEY } from "@/lib/types/invoice";
import { notifyStorageKey, subscribeStorageKey } from "@/lib/storage/storage-events";

export function subscribeInvoices(listener: () => void): () => void {
  return subscribeStorageKey(INVOICES_STORAGE_KEY, listener);
}

export function notifyInvoicesChanged(): void {
  notifyStorageKey(INVOICES_STORAGE_KEY);
}
