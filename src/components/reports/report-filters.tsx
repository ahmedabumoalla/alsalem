"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { InvoiceFilters } from "@/lib/utils/invoice-filters";

interface ReportFiltersProps {
  open: boolean;
  filters: InvoiceFilters;
  sellers: string[];
  customers: string[];
  pressures: number[];
  onApply: (value: InvoiceFilters) => void;
  onClose: () => void;
  onReset: () => void;
}

export function ReportFilters({
  open,
  filters,
  sellers,
  customers,
  pressures,
  onApply,
  onClose,
  onReset,
}: ReportFiltersProps) {
  const [draft, setDraft] = useState(filters);
  const update = (key: keyof InvoiceFilters, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <Modal open={open} onClose={onClose} title="تصفية النتائج" className="sm:max-w-3xl">
      <p className="mb-5 text-sm text-muted">اختر ما تحتاجه فقط، وسيُطبق على السجل والملخصات وملفات التصدير.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="من تاريخ" type="date" value={draft.dateFrom} onChange={(event) => update("dateFrom", event.target.value)} />
        <Input label="إلى تاريخ" type="date" value={draft.dateTo} onChange={(event) => update("dateTo", event.target.value)} />
        <Select label="البائع" value={draft.sellerName} onChange={(event) => update("sellerName", event.target.value)} options={[{ value: "", label: "جميع البائعين" }, ...sellers.map((value) => ({ value, label: value }))]} />
        <Select label="العميل" value={draft.customerName} onChange={(event) => update("customerName", event.target.value)} options={[{ value: "", label: "جميع العملاء" }, ...customers.map((value) => ({ value, label: value }))]} />
        <Select label="الضغط" value={draft.densityPressure} onChange={(event) => update("densityPressure", event.target.value)} options={[{ value: "", label: "جميع الضغوط" }, ...pressures.map((value) => ({ value: String(value), label: String(value) }))]} />
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
        <Button variant="outline" onClick={() => { onReset(); onClose(); }}>إعادة ضبط</Button>
        <Button variant="ghost" onClick={onClose}>إغلاق</Button>
        <Button className="sm:mr-auto" onClick={() => { onApply(draft); onClose(); }}>تطبيق</Button>
      </div>
    </Modal>
  );
}
