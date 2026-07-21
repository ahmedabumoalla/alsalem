"use client";

import { useParams, useRouter } from "next/navigation";
import { FileQuestion } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { InvoiceForm } from "@/components/sales/invoice-form";
import { EmptyState } from "@/components/ui/empty-state";
import { useInvoiceById, useIsClient } from "@/lib/hooks/use-invoices";

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isClient = useIsClient();
  const invoice = useInvoiceById(id);

  if (!isClient) {
    return (
      <PageContainer>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-pulse rounded-full bg-secondary/20" />
        </div>
      </PageContainer>
    );
  }

  if (!invoice) {
    return (
      <PageContainer>
        <EmptyState
          icon={<FileQuestion className="h-8 w-8" />}
          title="لم يتم العثور على الفاتورة المطلوبة"
          description="قد تكون الفاتورة محذوفة أو الرابط غير صحيح."
          actionLabel="العودة للتقارير"
          onAction={() => router.push("/reports")}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">
          تعديل الفاتورة {invoice.invoiceNumber}
        </h1>
        <p className="mt-2 text-muted">
          عدّل بيانات الفاتورة وسيتم إعادة حساب الإجماليات والأرباح تلقائيًا.
        </p>
      </div>
      <InvoiceForm mode="edit" existingInvoice={invoice} />
    </PageContainer>
  );
}
