"use client";

import { useSyncExternalStore } from "react";
import type { Invoice } from "@/lib/types/invoice";
import { useRemoteCollection } from "@/lib/hooks/use-remote-collection";

export function useInvoices(): Invoice[] {
  return useRemoteCollection<Invoice>("/api/invoices", "invoices");
}

export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function useInvoiceById(id: string): Invoice | undefined {
  const invoices = useInvoices();
  return invoices.find((invoice) => invoice.id === id);
}
