"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, UploadCloud, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestData, notifyDataChanged } from "@/lib/api/client";
import { INVOICES_BACKUP_KEY, INVOICES_STORAGE_KEY } from "@/lib/types/invoice";
import { PRESSURE_COSTS_STORAGE_KEY } from "@/lib/types/pressure-cost";
import { RECEIPTS_STORAGE_KEY } from "@/lib/types/receipt";
import { LEADS_STORAGE_KEY } from "@/lib/types/lead";

const IMPORT_MARKER = "foam_sales_supabase_import_v1";
const DATA_KEYS = [
  INVOICES_STORAGE_KEY,
  PRESSURE_COSTS_STORAGE_KEY,
  RECEIPTS_STORAGE_KEY,
  LEADS_STORAGE_KEY,
] as const;

interface MigrationReport {
  importId: string;
  completed: boolean;
  countsMatched: boolean;
  importedAt: string;
  sections: Record<
    string,
    {
      source: number;
      imported: number;
      skipped: number;
      failed: number;
      errors: string[];
    }
  >;
  totals: {
    sourceInvoiceTotal: number;
    databaseInvoiceTotal: number;
    sourceReceiptTotal: number;
    databaseReceiptTotal: number;
    matched: boolean;
  };
}

function parseArray(raw: string | null): unknown[] {
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value))
    throw new Error("إحدى نسخ البيانات المحلية ليست مصفوفة JSON صالحة.");
  return value;
}

function readBackup() {
  const values: Record<string, string | null> = {};
  for (const key of [...DATA_KEYS, INVOICES_BACKUP_KEY])
    values[key] = localStorage.getItem(key);
  return { exportedAt: new Date().toISOString(), app: "FoamSales", values };
}

function downloadBackup(): void {
  const blob = new Blob([JSON.stringify(readBackup(), null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `foamsales-local-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function LocalDataMigration() {
  const [ready, setReady] = useState(false);
  const [raw, setRaw] = useState<Record<string, string | null>>({});
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    const next: Record<string, string | null> = {};
    for (const key of DATA_KEYS) next[key] = localStorage.getItem(key);
    setRaw(next);
    setReady(true);
  };
  useEffect(() => {
    queueMicrotask(refresh);
  }, []);

  const counts = useMemo(() => {
    try {
      return DATA_KEYS.map((key) => parseArray(raw[key]).length);
    } catch {
      return DATA_KEYS.map(() => 0);
    }
  }, [raw]);
  const hasLocalData = counts.some((count) => count > 0);
  if (!ready || !hasLocalData) return null;

  const migrate = async () => {
    setBusy(true);
    setError("");
    try {
      downloadBackup();
      const importId = crypto.randomUUID();
      const result = await requestData<MigrationReport>(
        "/api/migrate-local-data",
        {
          method: "POST",
          body: JSON.stringify({
            importId,
            invoices: parseArray(raw[INVOICES_STORAGE_KEY]),
            pressureCosts: parseArray(raw[PRESSURE_COSTS_STORAGE_KEY]),
            receipts: parseArray(raw[RECEIPTS_STORAGE_KEY]),
            leads: parseArray(raw[LEADS_STORAGE_KEY]),
          }),
        },
      );
      setReport(result);
      if (result.completed) {
        localStorage.setItem(
          IMPORT_MARKER,
          JSON.stringify({
            importId: result.importId,
            importedAt: result.importedAt,
          }),
        );
        notifyDataChanged("");
      }
    } catch (migrationError) {
      setError(
        migrationError instanceof Error
          ? migrationError.message
          : "تعذر ترحيل البيانات المحلية.",
      );
    } finally {
      setBusy(false);
    }
  };

  const clearLocal = () => {
    if (
      !report?.completed ||
      !window.confirm(
        "تم التحقق من الترحيل. هل تريد حذف النسخة التشغيلية المحلية؟ ستبقى نسخة الفواتير الاحتياطية إن وجدت.",
      )
    )
      return;
    for (const key of DATA_KEYS) localStorage.removeItem(key);
    refresh();
  };

  return (
    <section className="border-b border-accent/30 bg-accent/10 px-4 py-3 text-sm">
      <div className="mx-auto max-w-7xl space-y-3">
        <div>
          <b className="text-primary">
            توجد بيانات FoamSales محلية تحتاج إلى ترحيل
          </b>
          <p className="mt-1 text-muted">
            الفواتير: {counts[0]}، التكاليف: {counts[1]}، السندات: {counts[2]}،
            العملاء المحتملون: {counts[3]}. لن تُحذف تلقائيًا.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={downloadBackup}
          >
            <Download className="h-4 w-4" />
            تنزيل نسخة JSON
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void migrate()}
            disabled={busy}
          >
            <UploadCloud className="h-4 w-4" />
            {busy ? "جارٍ الترحيل..." : "ترحيل إلى Supabase"}
          </Button>
          {report?.completed && (
            <Button
              type="button"
              size="sm"
              variant="danger"
              onClick={clearLocal}
            >
              <Trash2 className="h-4 w-4" />
              حذف النسخة المحلية بعد التحقق
            </Button>
          )}
        </div>
        {error && <p className="text-danger">{error}</p>}
        {report && (
          <p className={report.completed ? "text-success" : "text-danger"}>
            {report.completed
              ? "اكتمل الترحيل وتطابقت أعداد السجلات وإجماليات الفواتير والسندات."
              : "اكتملت المحاولة مع أخطاء أو عدم تطابق؛ لم تُحذف أي بيانات محلية."}
          </p>
        )}
      </div>
    </section>
  );
}
