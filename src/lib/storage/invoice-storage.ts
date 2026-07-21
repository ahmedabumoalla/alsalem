import type { Invoice } from "@/lib/types/invoice";
import { INVOICES_BACKUP_KEY, INVOICES_STORAGE_KEY } from "@/lib/types/invoice";
import { notifyInvoicesChanged } from "@/lib/storage/invoice-storage-events";
import { needsInvoiceMigration, normalizeInvoices } from "@/lib/utils/invoice-normalize";

export const EMPTY_INVOICES: Invoice[] = [];

let cachedRawValue: string | null | undefined;
let cachedInvoices: Invoice[] = EMPTY_INVOICES;

export class StorageQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageQuotaError";
  }
}

export function invalidateInvoicesSnapshot(): void {
  cachedRawValue = undefined;
}

export function getInvoicesSnapshot(): Invoice[] {
  if (typeof window === "undefined") {
    return EMPTY_INVOICES;
  }

  const rawValue = window.localStorage.getItem(INVOICES_STORAGE_KEY);

  if (rawValue === cachedRawValue) {
    return cachedInvoices;
  }

  cachedRawValue = rawValue;

  if (!rawValue) {
    cachedInvoices = EMPTY_INVOICES;
    return cachedInvoices;
  }

  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      cachedInvoices = EMPTY_INVOICES;
      return cachedInvoices;
    }
    cachedInvoices = normalizeInvoices(parsed);
    if (parsed.some(needsInvoiceMigration)) {
      if (!window.localStorage.getItem(INVOICES_BACKUP_KEY)) {
        window.localStorage.setItem(INVOICES_BACKUP_KEY, rawValue);
      }
      const migratedRaw = JSON.stringify(cachedInvoices);
      window.localStorage.setItem(INVOICES_STORAGE_KEY, migratedRaw);
      cachedRawValue = migratedRaw;
    }
  } catch {
    cachedInvoices = EMPTY_INVOICES;
  }

  return cachedInvoices;
}

export function getServerInvoicesSnapshot(): Invoice[] {
  return EMPTY_INVOICES;
}

function writeRaw(data: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INVOICES_STORAGE_KEY, data);
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED")
    ) {
      throw new StorageQuotaError(
        "مساحة التخزين المحلية ممتلئة. احذف بعض الفواتير القديمة أو أزل صور الحوالات ثم حاول مرة أخرى."
      );
    }
    throw error;
  }
}

/** @deprecated Use getInvoicesSnapshot for reactive reads */
export function getInvoices(): Invoice[] {
  return getInvoicesSnapshot();
}

export function getInvoiceById(id: string): Invoice | undefined {
  return getInvoicesSnapshot().find((inv) => inv.id === id);
}

export function createInvoice(invoice: Invoice): void {
  const invoices = [...getInvoicesSnapshot(), invoice];
  writeRaw(JSON.stringify(invoices));
  invalidateInvoicesSnapshot();
  notifyInvoicesChanged();
}

export function updateInvoice(id: string, invoice: Invoice): void {
  const invoices = getInvoicesSnapshot().map((inv) =>
    inv.id === id ? invoice : inv
  );
  writeRaw(JSON.stringify(invoices));
  invalidateInvoicesSnapshot();
  notifyInvoicesChanged();
}

export function deleteInvoice(id: string): void {
  const invoices = getInvoicesSnapshot().filter((inv) => inv.id !== id);
  writeRaw(JSON.stringify(invoices));
  invalidateInvoicesSnapshot();
  notifyInvoicesChanged();
}
