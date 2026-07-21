"use client";
import type { CustomerReceipt } from "@/lib/types/receipt";
import { useRemoteCollection } from "@/lib/hooks/use-remote-collection";
export function useReceipts() {
  return useRemoteCollection<CustomerReceipt>("/api/receipts", "receipts");
}
