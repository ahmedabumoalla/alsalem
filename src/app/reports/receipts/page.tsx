"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast-provider";
import { useReceipts } from "@/lib/hooks/use-receipts";
import { deleteReceipt } from "@/lib/api/records-client";
import type { CustomerReceipt } from "@/lib/types/receipt";
import { formatCurrency, formatDate } from "@/lib/utils/format";

const method = { cash: "نقدي", bank_transfer: "تحويل بنكي", other: "أخرى" };

export default function ReceiptsPage() {
  const receipts = useReceipts();
  const { showToast } = useToast();
  const [view, setView] = useState<CustomerReceipt | null>(null);
  const [remove, setRemove] = useState<CustomerReceipt | null>(null);
  const sorted = [...receipts].sort((left, right) =>
    right.date.localeCompare(left.date),
  );
  const actions = (receipt: CustomerReceipt) => (
    <div className="flex flex-wrap gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-label="عرض السند"
        onClick={() => setView(receipt)}
      >
        <Eye className="h-4 w-4" />
      </Button>
      {!receipt.source && (
        <Link href={`/reports/receipts/${receipt.id}/edit`}>
          <Button variant="ghost" size="sm" aria-label="تعديل السند">
            <Pencil className="h-4 w-4" />
          </Button>
        </Link>
      )}
      <Button
        variant="ghost"
        size="sm"
        aria-label="حذف السند"
        onClick={() => setRemove(receipt)}
      >
        <Trash2 className="h-4 w-4 text-danger" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">
            سندات القبض
          </h1>
          <p className="mt-2 text-sm text-muted sm:text-base">
            سجل مستقل لجميع تحصيلات العملاء.
          </p>
        </div>
        <Link href="/reports/receipts/new">
          <Button>
            <Plus className="h-4 w-4" />
            سند جديد
          </Button>
        </Link>
      </div>
      {receipts.length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="h-8 w-8" />}
          title="لا توجد سندات قبض"
          description="أضف أول سند عند تحصيل دفعة من عميل."
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {sorted.map((receipt) => (
              <article
                key={receipt.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <b dir="ltr" className="text-primary">
                      {receipt.receiptNumber}
                    </b>
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(receipt.date)}
                    </p>
                  </div>
                  <b className="text-success">
                    {formatCurrency(receipt.amount)}
                  </b>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted">العميل</dt>
                    <dd className="font-medium">{receipt.customerName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">الطريقة</dt>
                    <dd>{method[receipt.paymentMethod]}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted">المرجع</dt>
                    <dd>{receipt.reference ?? "—"}</dd>
                  </div>
                </dl>
                <div className="mt-3">{actions(receipt)}</div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-3xl border border-border bg-card md:block">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-background">
                <tr>
                  {[
                    "رقم السند",
                    "التاريخ",
                    "العميل",
                    "المبلغ",
                    "الطريقة",
                    "المرجع",
                    "إجراءات",
                  ].map((heading) => (
                    <th key={heading} className="p-4 text-right">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((receipt) => (
                  <tr key={receipt.id} className="border-t border-border">
                    <td className="p-4 font-bold" dir="ltr">
                      {receipt.receiptNumber}
                    </td>
                    <td className="p-4">{formatDate(receipt.date)}</td>
                    <td className="p-4">{receipt.customerName}</td>
                    <td className="p-4 font-bold text-success">
                      {formatCurrency(receipt.amount)}
                    </td>
                    <td className="p-4">{method[receipt.paymentMethod]}</td>
                    <td className="p-4">{receipt.reference ?? "—"}</td>
                    <td className="p-4">{actions(receipt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Modal
        open={!!view}
        onClose={() => setView(null)}
        title={`سند ${view?.receiptNumber ?? ""}`}
      >
        <div className="space-y-2 text-sm">
          <p>
            العميل: <b>{view?.customerName}</b>
          </p>
          <p>
            المبلغ: <b>{view && formatCurrency(view.amount)}</b>
          </p>
          <p>المرجع: {view?.reference ?? "—"}</p>
          <p>الملاحظات: {view?.notes ?? "—"}</p>
        </div>
      </Modal>
      <Modal
        open={!!remove}
        onClose={() => setRemove(null)}
        title="تأكيد الحذف"
      >
        <p>هل تريد حذف سند القبض {remove?.receiptNumber}؟</p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="danger"
            onClick={async () => {
              if (remove) {
                try {
                  await deleteReceipt(remove.id);
                  showToast("تم حذف سند القبض");
                  setRemove(null);
                } catch (error) {
                  showToast(
                    error instanceof Error
                      ? error.message
                      : "تعذر حذف سند القبض",
                    "error",
                  );
                }
              }
            }}
          >
            حذف
          </Button>
          <Button variant="outline" onClick={() => setRemove(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  );
}
