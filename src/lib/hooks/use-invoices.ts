"use client";

import { useSyncExternalStore } from "react";
import type { Invoice } from "@/lib/types/invoice";
import { useRemoteCollection } from "@/lib/hooks/use-remote-collection";

interface InvoiceDateQuery {
  dateFrom?: string;
  dateTo?: string;
}

export function useInvoices(dateQuery: InvoiceDateQuery = {}): Invoice[] {
  const searchParams = new URLSearchParams();
  if (dateQuery.dateFrom) searchParams.set("dateFrom", dateQuery.dateFrom);
  if (dateQuery.dateTo) searchParams.set("dateTo", dateQuery.dateTo);
  const query = searchParams.toString();
  return useRemoteCollection<Invoice>(`/api/invoices${query ? `?${query}` : ""}`, "invoices");
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
