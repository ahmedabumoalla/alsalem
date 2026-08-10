"use client";

import { useMemo, useState } from "react";
import { InvoiceReportSummary } from "@/components/reports/invoice-report-summary";
import { InvoicesTable } from "@/components/reports/invoices-table";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportsHeader } from "@/components/reports/reports-header";
import { ReportStatCards } from "@/components/reports/report-stat-cards";
import { useToast } from "@/components/ui/toast-provider";
import { useInvoices } from "@/lib/hooks/use-invoices";
import {
  calculateStats,
  createDefaultInvoiceFilters,
  filterInvoices,
  getUniqueCustomers,
  getUniquePressures,
  getUniqueSellers,
  hasNonDefaultInvoiceFilters,
  type InvoiceFilters,
} from "@/lib/utils/invoice-filters";
import {
  detectReportDatePreset,
  getReportDateRange,
  type QuickDatePreset,
} from "@/lib/utils/report-date-range";

export default function ReportsPage() {
  const { showToast } = useToast();
  const [filters, setFilters] = useState<InvoiceFilters>(() => createDefaultInvoiceFilters());
  const invoices = useInvoices({ dateFrom: filters.dateFrom, dateTo: filters.dateTo });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeExport, setActiveExport] = useState<"excel" | "pdf" | null>(null);

  const filteredInvoices = useMemo(() => filterInvoices(invoices, filters), [invoices, filters]);
  const stats = useMemo(() => calculateStats(filteredInvoices), [filteredInvoices]);
  const sellers = useMemo(() => getUniqueSellers(invoices), [invoices]);
  const customers = useMemo(() => getUniqueCustomers(invoices), [invoices]);
  const pressures = useMemo(() => getUniquePressures(invoices), [invoices]);
  const datePreset = detectReportDatePreset(filters);

  function handleDatePresetChange(
    preset: Exclude<QuickDatePreset, "custom">,
  ) {
    setFilters((current) => ({ ...current, ...getReportDateRange(preset) }));
  }

  function resetFilters() {
    setFilters((current) => ({
      ...createDefaultInvoiceFilters(),
      query: current.query,
    }));
  }

  async function handleExportExcel() {
    if (activeExport || filteredInvoices.length === 0) return;
    setActiveExport("excel");
    try {
      const { exportInvoicesToExcel } = await import("@/lib/utils/excel-export");
      exportInvoicesToExcel(filteredInvoices);
      showToast("تم تصدير ملف Excel بنجاح.");
    } catch {
      showToast("تعذر إنشاء ملف Excel. حاول مرة أخرى.", "error");
    } finally {
      setActiveExport(null);
    }
  }

  async function handleExportInvoicesPdf() {
    if (activeExport || filteredInvoices.length === 0) return;
    setActiveExport("pdf");
    try {
      const { exportInvoicesReportPdf } = await import("@/lib/utils/pdf-export");
      await exportInvoicesReportPdf({
        invoices: filteredInvoices,
        filters,
        generatedAt: new Date(),
      });
      showToast("تم تصدير تقرير الفواتير بنجاح.");
    } catch (error) {
      showToast(
        error instanceof Error && error.name === "PdfExportError"
          ? error.message
          : "تعذر إنشاء تقرير الفواتير. حاول مرة أخرى.",
        "error"
      );
    } finally {
      setActiveExport(null);
    }
  }

  const nonSearchFiltersActive = hasNonDefaultInvoiceFilters(filters);

  return (
    <div className="space-y-8">
      <ReportsHeader
        filteredCount={filteredInvoices.length}
        query={filters.query}
        onQueryChange={(query) => setFilters((current) => ({ ...current, query }))}
        onOpenFilters={() => setFiltersOpen(true)}
        datePreset={datePreset}
        onDatePresetChange={handleDatePresetChange}
        onExportExcel={handleExportExcel}
        onExportInvoicesPdf={handleExportInvoicesPdf}
        exportDisabled={filteredInvoices.length === 0}
        isExcelExporting={activeExport === "excel"}
        isInvoicesPdfExporting={activeExport === "pdf"}
      />

      <section id="invoices" className="scroll-mt-28 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-primary">سجل الفواتير</h2>
            <p className="mt-1 text-sm text-muted">النتائج المطابقة للبحث والفلاتر الحالية.</p>
          </div>
          {nonSearchFiltersActive && (
            <button
              type="button"
              className="text-sm font-medium text-secondary hover:underline"
              onClick={resetFilters}
            >
              مسح الفلاتر
            </button>
          )}
        </div>
        <InvoicesTable invoices={filteredInvoices} />
      </section>

      <section className="space-y-5 border-t border-border pt-8">
        <div>
          <h2 className="text-xl font-bold text-primary">تقارير المبيعات والأرباح</h2>
          <p className="mt-1 text-sm text-muted">ملخص خفيف يتحدث وفق النتائج الظاهرة دون رسوم بيانية.</p>
        </div>
        <ReportStatCards stats={stats} />
        <InvoiceReportSummary invoices={filteredInvoices} />
      </section>

      {filtersOpen && (
        <ReportFilters
          open
          filters={filters}
          sellers={sellers}
          customers={customers}
          pressures={pressures}
          onApply={setFilters}
          onClose={() => setFiltersOpen(false)}
          onReset={resetFilters}
        />
      )}
    </div>
  );
}
