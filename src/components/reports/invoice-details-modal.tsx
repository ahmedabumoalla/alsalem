"use client";

import { Modal } from "@/components/ui/modal";
import type { Invoice } from "@/lib/types/invoice";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils/format";

export function InvoiceDetailsModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={`تفاصيل الفاتورة ${invoice.invoiceNumber}`} className="max-w-5xl p-4 sm:p-6">
      <div className="grid gap-3 rounded-xl bg-background p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <p>التاريخ: <b>{formatDate(invoice.invoiceDate)}</b></p>
        <p>التسليم: <b>{formatDate(invoice.deliveryDate)}</b></p>
        <p>العميل: <b>{invoice.customerName || "غير مسجل"}</b></p>
        <p>رقم التواصل: <b dir="ltr">{invoice.customerPhone || "—"}</b></p>
        <p>البائع: <b>{invoice.sellerName}</b></p>
      </div>

      <div className="mt-5 space-y-3 md:hidden">
        {invoice.items.map((item, index) => (
          <article key={item.id} className="rounded-2xl border border-border p-4 text-sm">
            <div className="flex items-center justify-between"><b>الصنف {index + 1}</b><span className={item.costSource === "manual" ? "text-accent" : "text-success"}>{item.costSource === "manual" ? "تكلفة يدوية" : "تكلفة تلقائية"}</span></div>
            <p className="mt-2" dir="ltr">{item.lengthCm} × {item.widthCm} × {item.heightCm}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <span>الضغط: <b>{item.densityPressure}</b></span><span>الكمية: <b>{item.quantity}</b></span>
              <span>سعر الوحدة: <b>{formatCurrency(item.unitSalePrice)}</b></span><span>تكلفة الوحدة: <b>{formatCurrency(item.unitCost)}</b></span>
              <span>المبيعات: <b>{formatCurrency(item.productSubtotal)}</b></span><span>الربح: <b>{formatCurrency(item.netProfit)}</b></span>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[820px] text-sm">
          <thead><tr>{["#", "الأبعاد", "الضغط", "الكمية", "سعر الوحدة", "تكلفة الوحدة", "مصدر التكلفة", "المبيعات", "التكلفة", "الربح"].map((label) => <th key={label} className="border-b border-border p-3 text-right">{label}</th>)}</tr></thead>
          <tbody>{invoice.items.map((item, index) => <tr key={item.id}><td className="border-b border-border p-3">{index + 1}</td><td className="border-b border-border p-3" dir="ltr">{item.lengthCm} × {item.widthCm} × {item.heightCm}</td><td className="border-b border-border p-3">{item.densityPressure}</td><td className="border-b border-border p-3">{item.quantity}</td><td className="border-b border-border p-3">{formatCurrency(item.unitSalePrice)}</td><td className="border-b border-border p-3">{formatCurrency(item.unitCost)}</td><td className="border-b border-border p-3">{item.costSource === "manual" ? "يدوية" : "تلقائية"}</td><td className="border-b border-border p-3">{formatCurrency(item.productSubtotal)}</td><td className="border-b border-border p-3">{formatCurrency(item.totalCost)}</td><td className="border-b border-border p-3">{formatCurrency(item.netProfit)}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 rounded-xl bg-background p-4 text-sm sm:grid-cols-3">
        <p>إجمالي الفاتورة: <b>{formatCurrency(invoice.invoiceTotal)}</b></p>
        <p>إجمالي التكلفة: <b>{formatCurrency(invoice.totalCost)}</b></p>
        <p>صافي الربح: <b>{formatCurrency(invoice.netProfit)} ({formatPercent(invoice.profitMargin)})</b></p>
      </div>
      {invoice.notes && <p className="mt-4 text-sm">الملاحظات: {invoice.notes}</p>}
    </Modal>
  );
}
