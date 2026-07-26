"use client";

import { useMemo, useState } from "react";
import {
  calculateUnitCost,
  STANDARD_BLOCK_VOLUME_CM3,
} from "@/lib/utils/invoice-calculations";

export type PublicPressureCost = {
  pressure: number;
  standardBlockCost: number;
  standardLengthCm: number;
  standardWidthCm: number;
  standardHeightCm: number;
  updatedAt: string;
};

const numberFormatter = new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 });
const currencyFormatter = new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", minimumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat("ar-SA", { dateStyle: "long" });

export function CostCalculator({ costs }: { costs: PublicPressureCost[] }) {
  const [height, setHeight] = useState("");
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [pressure, setPressure] = useState(costs[0] ? String(costs[0].pressure) : "");
  const selected = costs.find((item) => String(item.pressure) === pressure);
  const values = [height, width, length].map(Number);
  const valid = Boolean(selected) && values.every((value, index) => value > 0 && Number.isFinite(value) && [height, width, length][index].trim() !== "");
  const result = useMemo(() => {
    if (!valid || !selected) return null;
    const itemVolume = values[0] * values[1] * values[2];
    return {
      itemVolume,
      ratio: itemVolume / STANDARD_BLOCK_VOLUME_CM3,
      cost: calculateUnitCost(
        selected.standardBlockCost,
        values[2],
        values[1],
        values[0]
      ),
    };
  }, [valid, selected, height, width, length]); // eslint-disable-line react-hooks/exhaustive-deps

  function clear() {
    setHeight(""); setWidth(""); setLength("");
    setPressure(costs[0] ? String(costs[0].pressure) : "");
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-3xl border border-border bg-card p-5 shadow-sm lg:grid-cols-[1.1fr_.9fr] lg:p-8">
        <div>
          <h2 className="text-xl font-extrabold">أبعاد القطعة</h2>
          <p className="mt-1 text-sm text-muted">أدخل القياسات بالسنتيمتر واختر الضغط لاحتساب التكلفة مباشرة.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[["الارتفاع", height, setHeight], ["العرض", width, setWidth], ["الطول", length, setLength]].map(([label, value, setter]) => (
              <label key={label as string} className="space-y-2">
                <span className="block text-sm font-bold">{label as string} (سم)</span>
                <input type="number" min="0.01" step="any" inputMode="decimal" value={value as string} onChange={(event) => (setter as (value: string) => void)(event.target.value)} className="min-h-12 w-full rounded-xl border border-border px-4 outline-none focus:border-secondary" />
              </label>
            ))}
            <label className="space-y-2">
              <span className="block text-sm font-bold">الضغط</span>
              <select required value={pressure} onChange={(event) => setPressure(event.target.value)} className="min-h-12 w-full rounded-xl border border-border bg-white px-4 outline-none focus:border-secondary">
                <option value="">اختر الضغط</option>
                {costs.map((item) => <option key={item.pressure} value={item.pressure}>ضغط {item.pressure}</option>)}
              </select>
            </label>
          </div>
          <button type="button" onClick={clear} className="mt-5 min-h-11 rounded-xl border border-border px-5 font-bold text-secondary">مسح</button>
        </div>
        <div className="flex min-h-64 flex-col justify-center rounded-2xl bg-primary p-6 text-white">
          <p className="text-sm text-white/75">تكلفة القطعة التقديرية</p>
          <p className="mt-2 break-words text-3xl font-extrabold sm:text-4xl">{result ? currencyFormatter.format(result.cost) : "—"}</p>
          {result ? (
            <dl className="mt-6 grid gap-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-white/70">الضغط المحدد</dt><dd className="font-bold">{selected?.pressure}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-white/70">حجم القطعة</dt><dd className="font-bold" dir="ltr">{numberFormatter.format(result.itemVolume)} سم³</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-white/70">نسبتها من البلك القياسي</dt><dd className="font-bold">{numberFormatter.format(result.ratio * 100)}٪</dd></div>
            </dl>
          ) : <p className="mt-5 text-sm text-white/70">أدخل أرقامًا موجبة واختر الضغط لإظهار النتيجة.</p>}
          <p className="mt-6 border-t border-white/15 pt-4 text-xs text-white/70">التكلفة التقديرية محسوبة حسب نسبة حجم القطعة من البلكة القياسية 100×120×400.</p>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm lg:p-8">
        <div className="mb-5">
          <h2 className="text-xl font-extrabold">أسعار تكلفة البلك حسب الضغط</h2>
          {costs.length > 0 && <p className="mt-1 text-sm text-muted">آخر تحديث للأسعار: {dateFormatter.format(new Date(Math.max(...costs.map((item) => new Date(item.updatedAt).getTime()))))}</p>}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {costs.map((item) => (
            <article key={item.pressure} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-extrabold">ضغط {item.pressure}</h3>
                <p className="font-extrabold text-secondary">{currencyFormatter.format(item.standardBlockCost)}</p>
              </div>
              <p className="mt-2 text-sm text-muted">المقاس القياسي: {numberFormatter.format(item.standardLengthCm)} × {numberFormatter.format(item.standardWidthCm)} × {numberFormatter.format(item.standardHeightCm)} سم</p>
              <p className="mt-1 text-xs text-muted">آخر تعديل: {dateFormatter.format(new Date(item.updatedAt))}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
