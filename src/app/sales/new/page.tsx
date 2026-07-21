"use client";

import { PageContainer } from "@/components/layout/page-container";
import { InvoiceForm } from "@/components/sales/invoice-form";
import { useIsClient } from "@/lib/hooks/use-invoices";

export default function NewInvoicePage() {
  const isClient = useIsClient();

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">
          إنشاء فاتورة مبيعات جديدة
        </h1>
        <p className="mt-2 text-muted">
          أدخل بيانات الفلين والبيع ليتم احتساب الإجماليات والأرباح تلقائيًا.
        </p>
      </div>
      {isClient ? (
        <InvoiceForm mode="create" />
      ) : (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-pulse rounded-full bg-secondary/20" />
        </div>
      )}
    </PageContainer>
  );
}
