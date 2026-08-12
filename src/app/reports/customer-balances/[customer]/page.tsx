"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Phone, ReceiptText, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { useReceipts } from "@/lib/hooks/use-receipts";
import {
  buildCustomerStatement,
  calculateCustomerBalances,
  getCustomerInvoices,
  getCustomerReceipts,
  normalizeCustomerName,
} from "@/lib/utils/customer-accounting";
import { formatCurrency, formatDate } from "@/lib/utils/format";

function decodeCustomerName(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value ?? "";
  try {
    return normalizeCustomerName(decodeURIComponent(raw));
  } catch {
    return normalizeCustomerName(raw);
  }
}

export default function CustomerStatementPage() {
  const params = useParams<{ customer: string }>();
  const customerName = decodeCustomerName(params.customer);
  const invoices = useInvoices();
  const receipts = useReceipts();
  const balance = calculateCustomerBalances(invoices, receipts).find(
    (row) => row.customerName === customerName,
  );
  const customerInvoices = getCustomerInvoices(customerName, invoices);
  const customerReceipts = getCustomerReceipts(customerName, receipts);
  const statement = buildCustomerStatement(customerName, invoices, receipts);

  if (!balance) {
    return (
      <div className="space-y-6">
        <Link href="/reports/customer-balances"><Button variant="outline"><ArrowRight className="h-4 w-4" />العودة</Button></Link>
        <EmptyState icon={<ReceiptText className="h-8 w-8" />} title="العميل غير موجود" description="لا توجد فواتير باسم هذا العميل." />
      </div>
    );
  }

  const encodedName = encodeURIComponent(customerName);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/reports/customer-balances" className="mb-3 inline-flex items-center gap-1 text-sm text-secondary hover:underline"><ArrowRight className="h-4 w-4" />أرصدة العملاء</Link>
          <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">كشف حساب {customerName}</h1>
          {balance.customerPhone && <a href={`tel:${balance.customerPhone}`} dir="ltr" className="mt-2 inline-flex items-center gap-2 text-secondary"><Phone className="h-4 w-4" />{balance.customerPhone}</a>}
        </div>
        {balance.balance > 0 && <Link href={`/reports/receipts/new?customer=${encodedName}`}><Button><WalletCards className="h-4 w-4" />تحصيل دفعة</Button></Link>}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["إجمالي المبيعات", balance.totalSales, "text-primary"],
          ["إجمالي المقبوضات", balance.totalReceipts, "text-success"],
          ["الرصيد المستحق", balance.balance, balance.balance > 0 ? "text-danger" : "text-success"],
        ].map(([label, value, color]) => <Card key={String(label)} className="p-4"><p className="text-xs text-muted">{label}</p><p className={`mt-2 text-xl font-bold ${color}`}>{formatCurrency(Number(value))}</p></Card>)}
      </div>

      <Card className="p-4 sm:p-6">
        <h2 className="text-lg font-bold text-primary">الحركة والرصيد الجاري</h2>
        <div className="mt-4 space-y-3 md:hidden">
          {statement.map((entry) => <article key={`${entry.type}-${entry.id}`} className="rounded-xl bg-background p-3 text-sm"><div className="flex justify-between gap-3"><b>{entry.type === "invoice" ? "فاتورة" : "سند قبض"}</b><span>{formatDate(entry.date)}</span></div><p className="mt-2 text-xs text-muted" dir="ltr">{entry.reference}</p><div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><span>مدين<b className="mt-1 block">{entry.debit ? formatCurrency(entry.debit) : "—"}</b></span><span>دائن<b className="mt-1 block text-success">{entry.credit ? formatCurrency(entry.credit) : "—"}</b></span><span>الرصيد<b className="mt-1 block">{formatCurrency(entry.runningBalance)}</b></span></div></article>)}
        </div>
        <div className="mt-4 hidden overflow-x-auto md:block"><table className="w-full min-w-[650px] text-sm"><thead><tr>{["التاريخ", "النوع", "المرجع", "مدين", "دائن", "الرصيد الجاري"].map((heading) => <th key={heading} className="border-b border-border p-3 text-right">{heading}</th>)}</tr></thead><tbody>{statement.map((entry) => <tr key={`${entry.type}-${entry.id}`}><td className="border-b border-border p-3">{formatDate(entry.date)}</td><td className="border-b border-border p-3">{entry.type === "invoice" ? "فاتورة" : "سند قبض"}</td><td className="border-b border-border p-3" dir="ltr">{entry.reference}</td><td className="border-b border-border p-3">{entry.debit ? formatCurrency(entry.debit) : "—"}</td><td className="border-b border-border p-3 text-success">{entry.credit ? formatCurrency(entry.credit) : "—"}</td><td className="border-b border-border p-3 font-bold">{formatCurrency(entry.runningBalance)}</td></tr>)}</tbody></table></div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4 sm:p-6"><h2 className="font-bold text-primary">الفواتير ({customerInvoices.length})</h2><div className="mt-4 space-y-2">{customerInvoices.map((invoice) => <div key={invoice.id} className="flex items-center justify-between gap-3 rounded-xl bg-background p-3 text-sm"><div><b dir="ltr">{invoice.invoiceNumber}</b><p className="text-xs text-muted">{formatDate(invoice.invoiceDate)}</p></div><b>{formatCurrency(invoice.invoiceTotal)}</b></div>)}</div></Card>
        <Card className="p-4 sm:p-6"><h2 className="font-bold text-primary">سندات القبض ({customerReceipts.length})</h2><div className="mt-4 space-y-2">{customerReceipts.length ? customerReceipts.map((receipt) => <div key={receipt.id} className="flex items-center justify-between gap-3 rounded-xl bg-background p-3 text-sm"><div><b dir="ltr">{receipt.receiptNumber}</b><p className="text-xs text-muted">{formatDate(receipt.date)}</p></div><b className="text-success">{formatCurrency(receipt.amount)}</b></div>) : <p className="text-sm text-muted">لا توجد سندات قبض.</p>}</div></Card>
      </div>
    </div>
  );
}
