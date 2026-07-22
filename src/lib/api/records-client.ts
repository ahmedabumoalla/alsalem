"use client";

import type { InitialPaymentInstruction, Invoice } from "@/lib/types/invoice";
import type { FoamPressureCost } from "@/lib/types/pressure-cost";
import type { CustomerReceipt } from "@/lib/types/receipt";
import type { Lead } from "@/lib/types/lead";
import { notifyDataChanged, requestData } from "@/lib/api/client";

const body = (value: unknown) => JSON.stringify(value);

export async function createInvoice(
  invoice: Invoice,
  initialPayment: InitialPaymentInstruction = { mode: "none" },
): Promise<Invoice> {
  const value = await requestData<Invoice>("/api/invoices", {
    method: "POST",
    body: body({ invoice, initialPayment }),
  });
  notifyDataChanged("invoices");
  if (initialPayment.mode === "partial" || initialPayment.mode === "paid") {
    notifyDataChanged("receipts");
  }
  return value;
}
export async function updateInvoice(id: string, invoice: Invoice): Promise<Invoice> { const value = await requestData<Invoice>(`/api/invoices/${encodeURIComponent(id)}`, { method: "PUT", body: body(invoice) }); notifyDataChanged("invoices"); return value; }
export async function deleteInvoice(id: string): Promise<void> { await requestData(`/api/invoices/${encodeURIComponent(id)}`, { method: "DELETE" }); notifyDataChanged("invoices"); }

export async function savePressureCost(item: FoamPressureCost): Promise<FoamPressureCost> { const value = await requestData<FoamPressureCost>("/api/pressure-costs", { method: "POST", body: body(item) }); notifyDataChanged("pressure-costs"); return value; }
export async function deletePressureCost(id: string): Promise<void> { await requestData(`/api/pressure-costs?id=${encodeURIComponent(id)}`, { method: "DELETE" }); notifyDataChanged("pressure-costs"); }

export async function createReceipt(receipt: CustomerReceipt): Promise<CustomerReceipt> { const value = await requestData<CustomerReceipt>("/api/receipts", { method: "POST", body: body(receipt) }); notifyDataChanged("receipts"); return value; }
export async function updateReceipt(id: string, receipt: CustomerReceipt): Promise<CustomerReceipt> { const value = await requestData<CustomerReceipt>(`/api/receipts/${encodeURIComponent(id)}`, { method: "PUT", body: body(receipt) }); notifyDataChanged("receipts"); return value; }
export async function deleteReceipt(id: string): Promise<void> { await requestData(`/api/receipts/${encodeURIComponent(id)}`, { method: "DELETE" }); notifyDataChanged("receipts"); }

export async function saveLead(lead: Lead): Promise<Lead> { const value = await requestData<Lead>("/api/leads", { method: "POST", body: body(lead) }); notifyDataChanged("leads"); return value; }
export async function deleteLead(id: string): Promise<void> { await requestData(`/api/leads/${encodeURIComponent(id)}`, { method: "DELETE" }); notifyDataChanged("leads"); }
export async function convertLead(id: string): Promise<Lead> { const value = await requestData<Lead>(`/api/leads/${encodeURIComponent(id)}`, { method: "PATCH", body: body({ status: "converted" }) }); notifyDataChanged("leads"); return value; }
