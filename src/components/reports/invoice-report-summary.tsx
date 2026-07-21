"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { Invoice } from "@/lib/types/invoice";
import { formatCurrency } from "@/lib/utils/format";
import { calculateFinancialTotals, calculateSellerBreakdown } from "@/lib/utils/invoice-report";

export function InvoiceReportSummary({ invoices }: { invoices: Invoice[] }) {
  const totals = calculateFinancialTotals(invoices);
  const sellers = calculateSellerBreakdown(invoices);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["إجمالي المبيعات", totals.totalSales],
          ["إجمالي التكلفة", totals.totalCost],
          ["إجمالي الربح", totals.totalProfit],
        ].map(([label, value]) => (
          <Card key={String(label)} className="p-4 sm:p-5"><p className="text-xs text-muted">{label}</p><p className="mt-2 text-xl font-bold text-primary">{formatCurrency(Number(value))}</p></Card>
        ))}
      </div>
      <Card className="p-4 sm:p-6">
        <CardHeader><CardTitle>تفصيل البائعين</CardTitle><p className="text-sm text-muted">يعتمد على الفلاتر الحالية ويرتب حسب المبيعات.</p></CardHeader>
        {sellers.length === 0 ? <p className="text-sm text-muted">لا توجد بيانات بائعين.</p> : (
          <>
            <div className="space-y-3 md:hidden">{sellers.map((seller) => <article key={seller.sellerName} className="rounded-xl bg-background p-3"><b className="text-sm text-primary">{seller.sellerName}</b><div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs"><span>المبيعات<b className="mt-1 block">{formatCurrency(seller.totalSales)}</b></span><span>التكلفة<b className="mt-1 block">{formatCurrency(seller.totalCost)}</b></span><span>الربح<b className="mt-1 block">{formatCurrency(seller.totalProfit)}</b></span></div></article>)}</div>
            <div className="hidden overflow-x-auto md:block"><table className="w-full text-sm"><thead><tr>{["البائع", "إجمالي المبيعات", "إجمالي التكلفة", "إجمالي الربح"].map((label) => <th key={label} className="border-b border-border p-3 text-right">{label}</th>)}</tr></thead><tbody>{sellers.map((seller) => <tr key={seller.sellerName}><td className="border-b border-border p-3 font-medium">{seller.sellerName}</td><td className="border-b border-border p-3">{formatCurrency(seller.totalSales)}</td><td className="border-b border-border p-3">{formatCurrency(seller.totalCost)}</td><td className="border-b border-border p-3 font-bold text-success">{formatCurrency(seller.totalProfit)}</td></tr>)}</tbody></table></div>
          </>
        )}
      </Card>
    </div>
  );
}
