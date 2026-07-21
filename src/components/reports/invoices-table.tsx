"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FileText, Pencil, Trash2 } from "lucide-react";
import { InvoiceDetailsModal } from "@/components/reports/invoice-details-modal";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast-provider";
import { deleteInvoice } from "@/lib/api/records-client";
import type { Invoice } from "@/lib/types/invoice";
import { formatCurrency, formatDateShort } from "@/lib/utils/format";
import { createInvoiceReportRows } from "@/lib/utils/invoice-report";

export function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const rows = createInvoiceReportRows(invoices);

  if (!invoices.length) {
    return (
      <EmptyState
        icon={<FileText className="h-8 w-8" />}
        title="لا توجد فواتير"
        description="لم يتم العثور على فواتير مطابقة."
        actionLabel="إنشاء فاتورة"
        onAction={() => router.push("/sales/new")}
      />
    );
  }

  const actions = (invoice: Invoice) => (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={() => setViewInvoice(invoice)} aria-label="عرض تفاصيل الفاتورة"><Eye className="h-4 w-4" /></Button>
      <Button variant="ghost" size="sm" onClick={() => router.push(`/sales/${invoice.id}/edit`)} aria-label="تعديل الفاتورة"><Pencil className="h-4 w-4" /></Button>
      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(invoice)} aria-label="حذف الفاتورة"><Trash2 className="h-4 w-4 text-danger" /></Button>
    </div>
  );

  return (
    <>
      <div className="space-y-3 md:hidden">
        {invoices.map((invoice, index) => {
          const row = rows[index];
          return (
            <article key={invoice.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted">{formatDateShort(row.date)}</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-bold text-primary">{row.customerOrMeasurements}</h3>
                  <p className="mt-1 text-xs text-muted">البائع: {row.sellerName}</p>
                </div>
                {actions(invoice)}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-background p-2"><span className="block text-muted">البيع</span><b className="mt-1 block text-primary">{formatCurrency(row.sales)}</b></div>
                <div className="rounded-xl bg-background p-2"><span className="block text-muted">التكلفة</span><b className="mt-1 block text-primary">{formatCurrency(row.cost)}</b></div>
                <div className="rounded-xl bg-success/10 p-2"><span className="block text-muted">الفائدة</span><b className={row.profit >= 0 ? "mt-1 block text-success" : "mt-1 block text-danger"}>{formatCurrency(row.profit)}</b></div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-3xl border border-border bg-card md:block">
        <table className="w-full min-w-[900px] table-fixed text-sm">
          <thead className="bg-background">
            <tr>
              {[
                ["التاريخ", "w-[13%]"],
                ["العميل / القياسات", "w-[28%]"],
                ["سعر البيع", "w-[12%]"],
                ["سعر التكلفة", "w-[12%]"],
                ["الفائدة", "w-[12%]"],
                ["البائع", "w-[13%]"],
                ["إجراءات", "w-[10%]"],
              ].map(([label, width]) => <th key={label} className={`${width} p-4 text-right`}>{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice, index) => {
              const row = rows[index];
              return (
                <tr key={invoice.id} className="border-t border-border align-top">
                  <td className="p-4">{formatDateShort(row.date)}</td>
                  <td className="p-4"><span className="line-clamp-2" title={row.customerOrMeasurements}>{row.customerOrMeasurements}</span></td>
                  <td className="p-4 font-bold">{formatCurrency(row.sales)}</td>
                  <td className="p-4">{formatCurrency(row.cost)}</td>
                  <td className={row.profit >= 0 ? "p-4 font-bold text-success" : "p-4 font-bold text-danger"}>{formatCurrency(row.profit)}</td>
                  <td className="p-4">{row.sellerName}</td>
                  <td className="p-3">{actions(invoice)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewInvoice && <InvoiceDetailsModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />}
      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="تأكيد الحذف">
        <p>هل تريد حذف الفاتورة {deleteTarget?.invoiceNumber}؟</p>
        <div className="mt-6 flex gap-3">
          <Button variant="danger" onClick={async () => { if (!deleteTarget) return; try { await deleteInvoice(deleteTarget.id); showToast("تم حذف الفاتورة"); setDeleteTarget(null); } catch (error) { showToast(error instanceof Error ? error.message : "تعذر حذف الفاتورة", "error"); } }}>حذف</Button>
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
        </div>
      </Modal>
    </>
  );
}
