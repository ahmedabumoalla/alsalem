"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, Phone, Users, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { useReceipts } from "@/lib/hooks/use-receipts";
import { calculateCustomerBalances } from "@/lib/utils/customer-accounting";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default function CustomerBalancesPage() {
  const invoices = useInvoices();
  const receipts = useReceipts();
  const [showAll, setShowAll] = useState(false);
  const balances = useMemo(
    () => calculateCustomerBalances(invoices, receipts),
    [invoices, receipts],
  );
  const shown = showAll ? balances : balances.filter((row) => row.balance > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">
            أرصدة العملاء
          </h1>
          <p className="mt-2 text-sm text-muted sm:text-base">
            المبيعات مدينة وسندات القبض دائنة، مع أحدث هاتف مسجل للعميل.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(event) => setShowAll(event.target.checked)}
          />
          عرض جميع العملاء
        </label>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title={showAll ? "لا توجد حسابات عملاء" : "لا توجد مديونيات حالية"}
          description="تظهر هنا الحسابات المرتبطة بفواتير تحمل اسم عميل مسجل."
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {shown.map((row) => {
              const encodedName = encodeURIComponent(row.customerName);
              return (
                <article
                  key={row.customerName}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-primary">
                        {row.customerName}
                      </h2>
                      {row.customerPhone && (
                        <a
                          className="mt-1 flex items-center gap-1 text-sm text-secondary"
                          href={`tel:${row.customerPhone}`}
                          dir="ltr"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {row.customerPhone}
                        </a>
                      )}
                    </div>
                    <span className="rounded-full bg-background px-2.5 py-1 text-xs text-muted">
                      {row.invoiceCount} فاتورة
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-xs text-muted">المبيعات</dt><dd className="font-semibold">{formatCurrency(row.totalSales)}</dd></div>
                    <div><dt className="text-xs text-muted">المقبوضات</dt><dd className="font-semibold text-success">{formatCurrency(row.totalReceipts)}</dd></div>
                    <div className="col-span-2 rounded-xl bg-background p-3"><dt className="text-xs text-muted">الرصيد المستحق</dt><dd className={`mt-1 text-lg font-bold ${row.balance > 0 ? "text-danger" : "text-success"}`}>{formatCurrency(row.balance)}</dd></div>
                  </dl>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link href={`/reports/customer-balances/${encodedName}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4" /> كشف الحساب
                      </Button>
                    </Link>
                    {row.balance > 0 ? (
                      <Link href={`/reports/receipts/new?customer=${encodedName}`}>
                        <Button size="sm" className="w-full">
                          <WalletCards className="h-4 w-4" /> تحصيل
                        </Button>
                      </Link>
                    ) : (
                      <span className="flex items-center justify-center text-sm text-success">مسدد</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-3xl border border-border bg-card md:block">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-background">
                <tr>
                  {["العميل", "الهاتف", "الفواتير", "المبيعات", "المقبوضات", "الرصيد المستحق", "آخر فاتورة", "آخر دفعة", "الإجراءات"].map((heading) => (
                    <th key={heading} className="p-4 text-right">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => {
                  const encodedName = encodeURIComponent(row.customerName);
                  return (
                    <tr key={row.customerName} className="border-t border-border">
                      <td className="p-4 font-bold text-primary">{row.customerName}</td>
                      <td className="p-4" dir="ltr">{row.customerPhone ?? "—"}</td>
                      <td className="p-4">{row.invoiceCount}</td>
                      <td className="p-4">{formatCurrency(row.totalSales)}</td>
                      <td className="p-4 text-success">{formatCurrency(row.totalReceipts)}</td>
                      <td className={`p-4 font-bold ${row.balance > 0 ? "text-danger" : "text-success"}`}>{formatCurrency(row.balance)}</td>
                      <td className="p-4">{row.lastInvoiceDate ? formatDate(row.lastInvoiceDate) : "—"}</td>
                      <td className="p-4">{row.lastReceiptDate ? formatDate(row.lastReceiptDate) : "—"}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Link href={`/reports/customer-balances/${encodedName}`}>
                            <Button variant="outline" size="sm">كشف الحساب</Button>
                          </Link>
                          {row.balance > 0 && (
                            <Link href={`/reports/receipts/new?customer=${encodedName}`}>
                              <Button size="sm">تحصيل</Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
