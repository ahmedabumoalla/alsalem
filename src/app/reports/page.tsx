"use client";

import { useMemo, useState } from "react";
import { InvoiceReportSummary } from "@/components/reports/invoice-report-summary";
import { InvoicesTable } from "@/components/reports/invoices-table";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportsHeader } from "@/components/reports/reports-header";
import { ReportStatCards } from "@/components/reports/report-stat-cards";
import { SalesCharts } from "@/components/reports/sales-charts";
import { useToast } from "@/components/ui/toast-provider";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { exportInvoicesToCsv } from "@/lib/utils/csv-export";
import {
  calculateStats,
  defaultFilters,
  filterInvoices,
  getUniqueCustomers,
  getUniquePressures,
  getUniqueSellers,
  type InvoiceFilters,
} from "@/lib/utils/invoice-filters";
import type { PdfReportSummary, PdfReportType } from "@/lib/utils/pdf-export";

export default function ReportsPage() {
  const invoices = useInvoices();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<InvoiceFilters>(defaultFilters);
  const [activePdfExport, setActivePdfExport] = useState<PdfReportType | null>(null);
  const filteredInvoices = useMemo(() => filterInvoices(invoices, filters), [invoices, filters]);
  const stats = useMemo(() => calculateStats(filteredInvoices), [filteredInvoices]);
  const pdfSummary = useMemo<PdfReportSummary>(() => stats, [stats]);
  const sellers = useMemo(() => getUniqueSellers(invoices), [invoices]);
  const customers = useMemo(() => getUniqueCustomers(invoices), [invoices]);
  const pressures = useMemo(() => getUniquePressures(invoices), [invoices]);

  const handleExportPdf = async (type: PdfReportType) => {
    if (activePdfExport) return;
    if (filteredInvoices.length === 0) {
      showToast("لا توجد فواتير مطابقة للفلاتر الحالية.", "error");
      return;
    }
    setActivePdfExport(type);
    try {
      const { exportGeneralReportPdf, exportInvoicesReportPdf } = await import("@/lib/utils/pdf-export");
      const baseOptions = { invoices: filteredInvoices, filters, generatedAt: new Date() };
      if (type === "general") {
        await exportGeneralReportPdf({ ...baseOptions, summary: pdfSummary });
        showToast("تم تصدير التقرير العام بنجاح.");
      } else {
        await exportInvoicesReportPdf(baseOptions);
        showToast("تم تصدير تقرير الفواتير بنجاح.");
      }
    } catch (error) {
      const message = error instanceof Error && error.name === "PdfExportError"
        ? error.message
        : type === "general"
          ? "تعذر إنشاء التقرير العام. حاول مرة أخرى."
          : "تعذر إنشاء تقرير الفواتير. حاول مرة أخرى.";
      showToast(message, "error");
    } finally {
      setActivePdfExport(null);
    }
  };

  return <div className="space-y-8"><ReportsHeader filteredCount={filteredInvoices.length} onExportCsv={() => exportInvoicesToCsv(filteredInvoices)} onExportGeneralPdf={() => handleExportPdf("general")} onExportInvoicesPdf={() => handleExportPdf("invoices")} csvExportDisabled={filteredInvoices.length === 0} isGeneralPdfExporting={activePdfExport === "general"} isInvoicesPdfExporting={activePdfExport === "invoices"} pdfExportBusy={activePdfExport !== null} /><ReportStatCards stats={stats} /><ReportFilters filters={filters} sellers={sellers} customers={customers} pressures={pressures} onChange={setFilters} onReset={() => setFilters(defaultFilters)} /><SalesCharts invoices={filteredInvoices} /><section id="invoices" className="scroll-mt-28 space-y-4"><div><h2 className="text-xl font-bold text-primary">سجل الفواتير</h2><p className="mt-1 text-sm text-muted">النتائج المفلترة وإجماليات المبيعات والتكلفة والفائدة حسب البائع.</p></div><InvoiceReportSummary invoices={filteredInvoices} /><InvoicesTable invoices={filteredInvoices} /></section></div>;
}
