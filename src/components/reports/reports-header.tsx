"use client";

import Link from "next/link";
import {
  ChartColumn,
  Download,
  FileText,
  Files,
  LoaderCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatInvoiceCount } from "@/lib/utils/format";

interface ReportsHeaderProps {
  filteredCount: number;
  onExportCsv: () => void;
  onExportGeneralPdf: () => void;
  onExportInvoicesPdf: () => void;
  csvExportDisabled: boolean;
  isGeneralPdfExporting: boolean;
  isInvoicesPdfExporting: boolean;
  pdfExportBusy: boolean;
}

export function ReportsHeader({
  filteredCount,
  onExportCsv,
  onExportGeneralPdf,
  onExportInvoicesPdf,
  csvExportDisabled,
  isGeneralPdfExporting,
  isInvoicesPdfExporting,
  pdfExportBusy,
}: ReportsHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-primary/5" />
      <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-secondary/5" />
      <div className="absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative flex flex-wrap items-start justify-between gap-6 p-6 sm:p-8">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">
              تقارير المبيعات والأرباح
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/20 bg-secondary/5 px-3 py-1 text-xs font-medium text-secondary">
              <FileText className="h-3.5 w-3.5" />
              {formatInvoiceCount(filteredCount)}
            </span>
          </div>
          <p className="max-w-xl text-sm text-muted sm:text-base">
            نظرة تحليلية متكاملة على حركة المبيعات والتكاليف والأرباح.
          </p>
        </div>

        <div className="grid w-full gap-3 min-[390px]:grid-cols-2 lg:w-auto">
          <Link href="/sales/new">
            <Button size="md">
              <Plus className="h-4 w-4" />
              فاتورة جديدة
            </Button>
          </Link>
          <Button
            variant="outline"
            size="md"
            onClick={onExportCsv}
            disabled={csvExportDisabled}
          >
            <Download className="h-4 w-4" />
            تصدير CSV
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={onExportGeneralPdf}
            disabled={pdfExportBusy}
            aria-busy={isGeneralPdfExporting}
          >
            {isGeneralPdfExporting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ChartColumn className="h-4 w-4" />
            )}
            {isGeneralPdfExporting ? "جارٍ إنشاء العام..." : "PDF تقرير عام"}
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={onExportInvoicesPdf}
            disabled={pdfExportBusy}
            aria-busy={isInvoicesPdfExporting}
          >
            {isInvoicesPdfExporting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Files className="h-4 w-4" />
            )}
            {isInvoicesPdfExporting
              ? "جارٍ إنشاء الفواتير..."
              : "PDF تقرير الفواتير"}
          </Button>
        </div>
      </div>
    </div>
  );
}
