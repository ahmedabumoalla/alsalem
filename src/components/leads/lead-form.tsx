"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { saveLead } from "@/lib/api/records-client";
import type { Lead, LeadSource, LeadStatus } from "@/lib/types/lead";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/lib/utils/leads";

interface LeadFormProps {
  open: boolean;
  existing?: Lead;
  onClose: () => void;
}

export function LeadForm({ open, existing, onClose }: LeadFormProps) {
  const { showToast } = useToast();
  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [source, setSource] = useState<LeadSource>(existing?.source ?? "call");
  const [customSource, setCustomSource] = useState(existing?.customSource ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [status, setStatus] = useState<LeadStatus>(existing?.status ?? "new");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const now = new Date().toISOString();
    const lead: Lead = {
      id: existing?.id ?? crypto.randomUUID(),
      name,
      phone,
      source,
      customSource: source === "other" ? customSource : undefined,
      notes,
      status,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    try {
      await saveLead(lead);
      showToast(existing ? "تم تحديث العميل المحتمل" : "تمت إضافة العميل المحتمل");
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "تعذر حفظ العميل المحتمل");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={existing ? "تعديل عميل محتمل" : "إضافة عميل محتمل"}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="الاسم" value={name} onChange={(event) => setName(event.target.value)} required />
          <Input label="الجوال" type="tel" dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="05xxxxxxxx أو +9665xxxxxxxx" required />
          <Select label="كيف وصلنا له" value={source} onChange={(event) => setSource(event.target.value as LeadSource)} options={Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({ value, label }))} />
          <Select label="الحالة" value={status} onChange={(event) => setStatus(event.target.value as LeadStatus)} options={Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
          {source === "other" && <Input label="المصدر المخصص" value={customSource} onChange={(event) => setCustomSource(event.target.value)} required className="sm:col-span-2" />}
        </div>
        <div><label htmlFor="lead-notes" className="mb-1.5 block text-sm font-medium text-primary">ملاحظات (اختياري)</label><textarea id="lead-notes" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded-xl border border-border bg-card p-3 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20" /></div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose}>إلغاء</Button>
          <Button type="submit" className="w-full sm:w-auto">{existing ? "حفظ التعديل" : "إضافة"}</Button>
        </div>
      </form>
    </Modal>
  );
}
