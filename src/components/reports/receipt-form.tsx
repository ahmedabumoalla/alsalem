"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { useReceipts } from "@/lib/hooks/use-receipts";
import { createReceipt, updateReceipt } from "@/lib/api/records-client";
import type {
  CustomerReceipt,
  ReceiptPaymentMethod,
} from "@/lib/types/receipt";
import {
  getCustomerBalance,
  normalizeCustomerName,
  validateReceiptAmount,
} from "@/lib/utils/customer-accounting";
import { formatCurrency } from "@/lib/utils/format";
import { hasRecordedCustomerName } from "@/lib/utils/invoice-report";

function generateNumber() {
  return `RC-${format(new Date(), "yyyyMMdd-HHmmss")}`;
}
export function ReceiptForm({ existing }: { existing?: CustomerReceipt }) {
  const router = useRouter(),
    { showToast } = useToast(),
    invoices = useInvoices(),
    receipts = useReceipts();
  const customers = useMemo(
    () =>
      [
        ...new Set(
          invoices
            .map((i) => normalizeCustomerName(i.customerName))
            .filter(hasRecordedCustomerName),
        ),
      ].sort((a, b) => a.localeCompare(b, "ar")),
    [invoices],
  );
  const queryCustomer =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("customer") ?? "")
      : "";
  const [receiptNumber, setReceiptNumber] = useState(
    existing?.receiptNumber ?? generateNumber(),
  );
  const [customer, setCustomer] = useState(
    existing?.customerName ?? queryCustomer,
  );
  const [date, setDate] = useState(
    existing?.date ?? format(new Date(), "yyyy-MM-dd"),
  );
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [method, setMethod] = useState<ReceiptPaymentMethod>(
    existing?.paymentMethod ?? "cash",
  );
  const [reference, setReference] = useState(existing?.reference ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState("");
  const otherReceipts = existing
    ? receipts.filter((r) => r.id !== existing.id)
    : receipts;
  const balance = getCustomerBalance(customer, invoices, otherReceipts);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) {
      setError("اسم العميل مطلوب");
      return;
    }
    const numeric = Number(amount);
    const validation = validateReceiptAmount(numeric, balance);
    if (validation) {
      setError(validation);
      return;
    }
    const now = new Date().toISOString();
    const receipt: CustomerReceipt = {
      id: existing?.id ?? crypto.randomUUID(),
      receiptNumber,
      customerName: normalizeCustomerName(customer),
      date,
      amount: numeric,
      paymentMethod: method,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    try {
      if (existing) {
        await updateReceipt(existing.id, receipt);
      } else {
        await createReceipt(receipt);
      }
      showToast(existing ? "تم تحديث سند القبض" : "تم حفظ سند القبض");
      router.push("/reports/receipts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ السند");
    }
  };
  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{existing ? "تعديل سند القبض" : "سند قبض جديد"}</CardTitle>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="رقم السند"
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
            required
          />
          <Input
            label="التاريخ"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Select
            label="اسم العميل"
            value={customer}
            onChange={(e) => {
              setCustomer(e.target.value);
              setError("");
            }}
            options={[
              { value: "", label: "اختر العميل" },
              ...customers.map((name) => ({ value: name, label: name })),
            ]}
            required
          />
          <Input
            label="مبلغ السند (ر.س)"
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError("");
            }}
            required
          />
          <Select
            label="طريقة الدفع"
            value={method}
            onChange={(e) => setMethod(e.target.value as ReceiptPaymentMethod)}
            options={[
              { value: "cash", label: "نقدي" },
              { value: "bank_transfer", label: "تحويل بنكي" },
              { value: "other", label: "أخرى" },
            ]}
          />
          <Input
            label="المرجع (اختياري)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">ملاحظات</label>
            <textarea
              className="w-full rounded-xl border border-border p-3"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-background p-3 text-sm">
          الرصيد المتاح للتحصيل: <b>{formatCurrency(balance)}</b>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Card>
      <div className="flex gap-3">
        <Button type="submit">{existing ? "حفظ التعديل" : "حفظ السند"}</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/reports/receipts")}
        >
          إلغاء
        </Button>
      </div>
    </form>
  );
}
