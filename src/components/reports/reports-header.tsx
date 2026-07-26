"use client";

import Link from "next/link";
import {
  FileSpreadsheet,
  Files,
  Filter,
  LoaderCircle,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatInvoiceCount } from "@/lib/utils/format";

interface ReportsHeaderProps {
  filteredCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  onOpenFilters: () => void;
  onExportExcel: () => Promise<void>;
  onExportInvoicesPdf: () => Promise<void>;
  exportDisabled: boolean;
  isExcelExporting: boolean;
  isInvoicesPdfExporting: boolean;
}

export function ReportsHeader({
  filteredCount,
  query,
  onQueryChange,
  onOpenFilters,
  onExportExcel,
  onExportInvoicesPdf,
  exportDisabled,
  isExcelExporting,
  isInvoicesPdfExporting,
}: ReportsHeaderProps) {
  const exportBusy = isExcelExporting || isInvoicesPdfExporting;
  return (
    <header className="space-y-5 border-b border-border pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">تقارير المبيعات والأرباح</h1>
            <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              {formatInvoiceCount(filteredCount)}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted">سجل الفواتير أولًا، ثم ملخصات المبيعات والتكلفة والربح.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/sales/new">
            <Button><Plus className="h-4 w-4" />فاتورة جديدة</Button>
          </Link>
          <Button variant="outline" onClick={() => void onExportExcel()} disabled={exportDisabled || exportBusy}>
            {isExcelExporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            تصدير Excel
          </Button>
          <Button variant="outline" onClick={() => void onExportInvoicesPdf()} disabled={exportDisabled || exportBusy}>
            {isInvoicesPdfExporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Files className="h-4 w-4" />}
            PDF تقرير الفواتير
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">بحث في الفواتير</span>
          <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="ابحث برقم الفاتورة أو العميل أو البائع"
            className="h-11 w-full rounded-xl border border-border bg-card pr-11 pl-4 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/15"
          />
        </label>
        <Button variant="outline" onClick={onOpenFilters}>
          <Filter className="h-4 w-4" />الفلاتر
        </Button>
      </div>
    </header>
  );
}
