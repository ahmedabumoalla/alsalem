"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UsersRound,
} from "lucide-react";
import { LeadForm } from "@/components/leads/lead-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { useLeads } from "@/lib/hooks/use-leads";
import { convertLead, deleteLead } from "@/lib/api/records-client";
import type { Lead, LeadSource, LeadStatus } from "@/lib/types/lead";
import { formatDate } from "@/lib/utils/format";
import {
  DEFAULT_LEAD_FILTERS,
  filterLeads,
  getLeadSourceLabel,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
} from "@/lib/utils/leads";

export default function LeadsPage() {
  const leads = useLeads();
  const { showToast } = useToast();
  const [query, setQuery] = useState(DEFAULT_LEAD_FILTERS.query);
  const [source, setSource] = useState<"" | LeadSource>(
    DEFAULT_LEAD_FILTERS.source,
  );
  const [status, setStatus] = useState<"" | LeadStatus>(
    DEFAULT_LEAD_FILTERS.status,
  );
  const [formLead, setFormLead] = useState<Lead | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Lead | null>(null);
  const filtered = useMemo(
    () => filterLeads(leads, { query, source, status }),
    [leads, query, source, status],
  );

  const handleConvert = async (lead: Lead) => {
    try {
      await convertLead(lead.id);
      showToast("تم تغيير الحالة إلى تم التحويل دون إنشاء فاتورة");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "تعذر تحديث العميل المحتمل",
        "error",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">
            العملاء المحتملون
          </h1>
          <p className="mt-2 text-sm text-muted">
            متابعة فرص البيع محليًا دون إرسال رسائل أو إنشاء فواتير تلقائيًا.
          </p>
        </div>
        <Button onClick={() => setFormLead("new")}>
          <Plus className="h-4 w-4" />
          إضافة عميل محتمل
        </Button>
      </div>

      <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-muted" />
          <Input
            aria-label="البحث بالاسم أو الجوال"
            placeholder="بحث بالاسم أو الجوال"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pr-9"
          />
        </div>
        <Select
          aria-label="تصفية حسب المصدر"
          value={source}
          onChange={(event) => setSource(event.target.value as "" | LeadSource)}
          options={[
            { value: "", label: "جميع المصادر" },
            ...Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
        <Select
          aria-label="تصفية حسب الحالة"
          value={status}
          onChange={(event) => setStatus(event.target.value as "" | LeadStatus)}
          options={[
            { value: "", label: "جميع الحالات" },
            ...Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
      </section>

      <div className="flex items-center justify-between text-sm">
        <p className="font-medium text-primary">النتائج: {filtered.length}</p>
        {(query || source || status) && (
          <button
            type="button"
            className="text-secondary hover:underline"
            onClick={() => {
              setQuery("");
              setSource("");
              setStatus("");
            }}
          >
            مسح الفلاتر
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-8 w-8" />}
          title={
            leads.length ? "لا توجد نتائج مطابقة" : "لا يوجد عملاء محتملون"
          }
          description={
            leads.length
              ? "غيّر البحث أو الفلاتر."
              : "أضف أول فرصة بيع للبدء بمتابعتها."
          }
          actionLabel={!leads.length ? "إضافة أول عميل" : undefined}
          onAction={!leads.length ? () => setFormLead("new") : undefined}
        />
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {filtered.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onEdit={() => setFormLead(lead)}
                onDelete={() => setPendingDelete(lead)}
                onConvert={() => handleConvert(lead)}
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-3xl border border-border bg-card lg:block">
            <table className="w-full min-w-[950px] text-sm">
              <thead className="bg-background">
                <tr>
                  {[
                    "الاسم",
                    "الجوال",
                    "المصدر",
                    "الحالة",
                    "تاريخ الإضافة",
                    "الملاحظات",
                    "الإجراءات",
                  ].map((heading) => (
                    <th key={heading} className="p-4 text-right">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-t border-border">
                    <td className="p-4 font-bold text-primary">{lead.name}</td>
                    <td className="p-4" dir="ltr">
                      {lead.phone}
                    </td>
                    <td className="p-4">{getLeadSourceLabel(lead)}</td>
                    <td className="p-4">{LEAD_STATUS_LABELS[lead.status]}</td>
                    <td className="p-4">{formatDate(lead.createdAt)}</td>
                    <td
                      className="max-w-[220px] truncate p-4"
                      title={lead.notes}
                    >
                      {lead.notes ?? "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="تعديل"
                          onClick={() => setFormLead(lead)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {lead.status !== "converted" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConvert(lead)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            تحويل إلى عميل
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="حذف"
                          onClick={() => setPendingDelete(lead)}
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {formLead && (
        <LeadForm
          key={formLead === "new" ? "new" : formLead.id}
          open
          existing={formLead === "new" ? undefined : formLead}
          onClose={() => setFormLead(null)}
        />
      )}
      <Modal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="تأكيد الحذف"
      >
        <p className="text-sm">
          هل تريد حذف العميل المحتمل <b>{pendingDelete?.name}</b>؟
        </p>
        <div className="mt-6 flex gap-2">
          <Button
            variant="danger"
            onClick={async () => {
              if (pendingDelete) {
                try {
                  await deleteLead(pendingDelete.id);
                  showToast("تم حذف العميل المحتمل");
                  setPendingDelete(null);
                } catch (error) {
                  showToast(
                    error instanceof Error
                      ? error.message
                      : "تعذر حذف العميل المحتمل",
                    "error",
                  );
                }
              }
            }}
          >
            حذف
          </Button>
          <Button variant="outline" onClick={() => setPendingDelete(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function LeadCard({
  lead,
  onEdit,
  onDelete,
  onConvert,
}: {
  lead: Lead;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: () => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-bold text-primary">{lead.name}</h2>
          <a
            href={`tel:${lead.phone}`}
            dir="ltr"
            className="mt-1 block text-sm text-secondary"
          >
            {lead.phone}
          </a>
        </div>
        <span className="rounded-full bg-background px-2.5 py-1 text-xs">
          {LEAD_STATUS_LABELS[lead.status]}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted">المصدر</dt>
          <dd>{getLeadSourceLabel(lead)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">تاريخ الإضافة</dt>
          <dd>{formatDate(lead.createdAt)}</dd>
        </div>
      </dl>
      {lead.notes && (
        <p className="mt-3 line-clamp-3 rounded-xl bg-background p-3 text-sm text-muted">
          {lead.notes}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          تعديل
        </Button>
        {lead.status !== "converted" && (
          <Button variant="secondary" size="sm" onClick={onConvert}>
            <CheckCircle2 className="h-4 w-4" />
            تحويل إلى عميل
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-danger" />
          حذف
        </Button>
      </div>
    </article>
  );
}
