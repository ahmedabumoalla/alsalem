"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Copy, Plus, RefreshCw, Trash2 } from "lucide-react";
import { InvoiceSummary } from "@/components/sales/invoice-summary";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { usePressureCosts } from "@/lib/hooks/use-pressure-costs";
import { createInvoice, updateInvoice } from "@/lib/api/records-client";
import type {
  CostSource,
  InitialPaymentInstruction,
  InitialPaymentMode,
  Invoice,
  InvoiceItem,
} from "@/lib/types/invoice";
import { INVOICE_SCHEMA_VERSION } from "@/lib/types/invoice";
import { isValidOptionalPhone, normalizePhone } from "@/lib/utils/contact";
import { formatCurrency } from "@/lib/utils/format";
import {
  calculateInvoiceItem,
  calculateInvoiceTotals,
  MISSING_PRESSURE_COST_MESSAGE,
} from "@/lib/utils/invoice-calculations";
import { generateInvoiceNumber } from "@/lib/utils/invoice-number";

interface ItemForm {
  id: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  densityPressure: string;
  quantity: string;
  unitSalePrice: string;
  unitCost: string;
  costSource: CostSource;
  weightKg: string;
}

interface FormData {
  invoiceNumber: string;
  invoiceDate: string;
  deliveryDate: string;
  sellerName: string;
  customerName: string;
  customerPhone: string;
  deliveryFee: string;
  notes: string;
  items: ItemForm[];
}

interface InitialPaymentForm {
  mode: InitialPaymentMode;
  amount: string;
  paymentMethod: "cash" | "bank_transfer" | "other";
  reference: string;
}

type Errors = Record<string, string>;
const today = format(new Date(), "yyyy-MM-dd");

function newItem(): ItemForm {
  return {
    id: crypto.randomUUID(),
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    densityPressure: "",
    quantity: "1",
    unitSalePrice: "",
    unitCost: "",
    costSource: "auto",
    weightKg: "",
  };
}

function invoiceToForm(invoice: Invoice): FormData {
  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    deliveryDate: invoice.deliveryDate,
    sellerName: invoice.sellerName,
    customerName: invoice.customerName,
    customerPhone: invoice.customerPhone ?? "",
    deliveryFee: String(invoice.deliveryFee),
    notes: invoice.notes ?? "",
    items: invoice.items.map((item) => ({
      id: item.id,
      lengthCm: String(item.lengthCm),
      widthCm: String(item.widthCm),
      heightCm: String(item.heightCm),
      densityPressure: String(item.densityPressure),
      quantity: String(item.quantity),
      unitSalePrice: String(item.unitSalePrice),
      unitCost: String(item.unitCost),
      costSource: item.costSource ?? "auto",
      weightKg: item.weightKg == null ? "" : String(item.weightKg),
    })),
  };
}

function validateForm(form: FormData, pressures: Set<number>): Errors {
  const errors: Errors = {};
  if (!form.invoiceDate) errors.invoiceDate = "تاريخ الفاتورة مطلوب";
  if (!form.deliveryDate) errors.deliveryDate = "تاريخ التسليم مطلوب";
  if (form.invoiceDate && form.deliveryDate && form.deliveryDate < form.invoiceDate) {
    errors.deliveryDate = "تاريخ التسليم لا يمكن أن يكون قبل تاريخ الفاتورة";
  }
  if (!form.sellerName.trim()) errors.sellerName = "اسم البائع مطلوب";
  if (!isValidOptionalPhone(form.customerPhone)) {
    errors.customerPhone = "أدخل رقم تواصل صالحًا من 7 إلى 15 رقمًا";
  }
  const deliveryFee = Number(form.deliveryFee);
  if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
    errors.deliveryFee = "رسوم التوصيل يجب أن تكون صفرًا أو أكثر";
  }
  if (!form.items.length) errors.general = "يجب إضافة صنف واحد على الأقل";

  form.items.forEach((item, index) => {
    const prefix = `item-${item.id}-`;
    const dimensions: [keyof ItemForm, string][] = [
      ["heightCm", "الارتفاع"],
      ["widthCm", "العرض"],
      ["lengthCm", "الطول"],
    ];
    dimensions.forEach(([key, label]) => {
      const value = Number(item[key]);
      if (!Number.isFinite(value) || value <= 0) {
        errors[prefix + key] = `${label} يجب أن يكون أكبر من صفر`;
      }
    });
    if (!pressures.has(Number(item.densityPressure))) {
      errors[prefix + "densityPressure"] = MISSING_PRESSURE_COST_MESSAGE;
    }
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      errors[prefix + "quantity"] = "الكمية يجب أن تكون عددًا صحيحًا لا يقل عن 1";
    }
    const salePrice = Number(item.unitSalePrice);
    if (!Number.isFinite(salePrice) || salePrice < 0) {
      errors[prefix + "unitSalePrice"] = "سعر البيع يجب أن يكون صفرًا أو أكثر";
    }
    if (item.costSource === "manual") {
      const unitCost = Number(item.unitCost);
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        errors[prefix + "unitCost"] = "تكلفة الوحدة يجب أن تكون رقمًا منتهيًا وصفرًا أو أكثر";
      }
    }
    if (item.weightKg && (!Number.isFinite(Number(item.weightKg)) || Number(item.weightKg) <= 0)) {
      errors[prefix + "weightKg"] = "الوزن يجب أن يكون أكبر من صفر";
    }
    if (Object.keys(errors).some((key) => key.startsWith(prefix))) {
      errors[`item-${item.id}`] = `راجع بيانات الصنف ${index + 1}`;
    }
  });
  return errors;
}

export function InvoiceForm({
  mode,
  existingInvoice,
}: {
  mode: "create" | "edit";
  existingInvoice?: Invoice;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const pressureCosts = usePressureCosts();
  const initialForm = (): FormData =>
    mode === "edit" && existingInvoice
      ? invoiceToForm(existingInvoice)
      : {
          invoiceNumber: generateInvoiceNumber(),
          invoiceDate: today,
          deliveryDate: today,
          sellerName: "",
          customerName: "",
          customerPhone: "",
          deliveryFee: "0",
          notes: "",
          items: [newItem()],
        };
  const [form, setForm] = useState<FormData>(initialForm);
  const [initialPayment, setInitialPayment] = useState<InitialPaymentForm>({
    mode: "none",
    amount: "",
    paymentMethod: "cash",
    reference: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const costMap = useMemo(
    () => new Map(pressureCosts.map((cost) => [cost.pressure, cost.standardBlockCost])),
    [pressureCosts]
  );

  const calculatedItems = useMemo(
    () =>
      form.items.map((item): InvoiceItem | null => {
        const standardBlockCost = costMap.get(Number(item.densityPressure));
        const lengthCm = Number(item.lengthCm);
        const widthCm = Number(item.widthCm);
        const heightCm = Number(item.heightCm);
        const quantity = Number(item.quantity);
        const unitSalePrice = Number(item.unitSalePrice);
        if (
          standardBlockCost == null ||
          ![lengthCm, widthCm, heightCm, quantity, unitSalePrice].every(Number.isFinite) ||
          [lengthCm, widthCm, heightCm, quantity].some((value) => value <= 0)
        ) {
          return null;
        }
        try {
          return calculateInvoiceItem({
            id: item.id,
            lengthCm,
            widthCm,
            heightCm,
            densityPressure: Number(item.densityPressure),
            quantity,
            unitSalePrice,
            standardBlockCost,
            unitCost: item.costSource === "manual" ? Number(item.unitCost) : undefined,
            costSource: item.costSource,
            weightKg: item.weightKg ? Number(item.weightKg) : undefined,
          });
        } catch {
          return null;
        }
      }),
    [costMap, form.items]
  );
  const totals = useMemo(
    () =>
      calculateInvoiceTotals(
        calculatedItems.filter((item): item is InvoiceItem => item !== null),
        Number(form.deliveryFee) || 0
      ),
    [calculatedItems, form.deliveryFee]
  );

  function updateField(key: Exclude<keyof FormData, "items">, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function updateItem(id: string, key: keyof ItemForm, value: string) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[`item-${id}-${key}`];
      delete next[`item-${id}`];
      return next;
    });
  }

  function setManualCost(id: string, value: string) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, unitCost: value, costSource: "manual" } : item
      ),
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[`item-${id}-unitCost`];
      return next;
    });
  }

  function resetAutomaticCost(id: string) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, unitCost: "", costSource: "auto" } : item
      ),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validateForm(form, new Set(pressureCosts.map((cost) => cost.pressure)));
    if (!existingInvoice && initialPayment.mode === "partial") {
      const amount = Number(initialPayment.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        nextErrors.initialPaymentAmount = "أدخل مبلغًا أكبر من صفر";
      } else if (amount > totals.invoiceTotal) {
        nextErrors.initialPaymentAmount = "لا يمكن أن تتجاوز الدفعة إجمالي الفاتورة";
      } else if (amount === totals.invoiceTotal) {
        nextErrors.initialPaymentAmount = "المبلغ الجزئي يجب أن يكون أقل من إجمالي الفاتورة";
      }
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      showToast("راجع الحقول المطلوبة", "error");
      return;
    }
    if (calculatedItems.some((item) => item === null)) {
      setErrors({ general: MISSING_PRESSURE_COST_MESSAGE });
      return;
    }
    const now = new Date().toISOString();
    const invoice: Invoice = {
      ...(existingInvoice ?? ({} as Invoice)),
      schemaVersion: INVOICE_SCHEMA_VERSION,
      id: existingInvoice?.id ?? crypto.randomUUID(),
      invoiceNumber: form.invoiceNumber,
      invoiceDate: form.invoiceDate,
      deliveryDate: form.deliveryDate,
      sellerName: form.sellerName.trim().replace(/\s+/g, " "),
      customerName: form.customerName.trim().replace(/\s+/g, " "),
      customerPhone: normalizePhone(form.customerPhone) || undefined,
      items: calculatedItems as InvoiceItem[],
      deliveryFee: Number(form.deliveryFee) || 0,
      notes: form.notes.trim() || undefined,
      ...totals,
      createdAt: existingInvoice?.createdAt ?? now,
      updatedAt: now,
    };
    try {
      setSaving(true);
      if (existingInvoice) {
        await updateInvoice(existingInvoice.id, invoice);
        showToast("تم تحديث الفاتورة بنجاح");
      } else {
        const paymentInstruction: InitialPaymentInstruction = {
          mode: initialPayment.mode,
          amount:
            initialPayment.mode === "paid"
              ? totals.invoiceTotal
              : initialPayment.mode === "partial"
                ? Number(initialPayment.amount)
                : undefined,
          paymentMethod: initialPayment.paymentMethod,
          reference: initialPayment.reference.trim() || undefined,
        };
        await createInvoice(invoice, paymentInstruction);
        showToast("تم حفظ الفاتورة بنجاح");
      }
      router.push("/reports");
    } catch (error) {
      const hasInitialReceipt =
        !existingInvoice &&
        (initialPayment.mode === "partial" || initialPayment.mode === "paid");
      const message = hasInitialReceipt
        ? "تعذر حفظ الفاتورة والدفعة، ولم يتم تسجيل أي بيانات"
        : error instanceof Error
          ? error.message
          : "حدث خطأ أثناء حفظ الفاتورة";
      setErrors({ general: message });
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
      {errors.general && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{errors.general}</div>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <div className="min-w-0 space-y-5 sm:space-y-6">
          <Card className="p-4 sm:p-6">
            <CardHeader><CardTitle>بيانات الفاتورة</CardTitle></CardHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="رقم الفاتورة" value={form.invoiceNumber} disabled />
              <Input label="تاريخ الفاتورة" type="date" value={form.invoiceDate} onChange={(event) => updateField("invoiceDate", event.target.value)} error={errors.invoiceDate} required />
              <Input label="تاريخ التسليم" type="date" value={form.deliveryDate} onChange={(event) => updateField("deliveryDate", event.target.value)} error={errors.deliveryDate} required />
              <Input label="اسم البائع" value={form.sellerName} onChange={(event) => updateField("sellerName", event.target.value)} error={errors.sellerName} required />
              <Input label="اسم العميل (اختياري)" value={form.customerName} onChange={(event) => updateField("customerName", event.target.value)} />
              <Input label="رقم تواصل العميل (اختياري)" type="tel" dir="ltr" placeholder="05xxxxxxxx أو +9665xxxxxxxx" value={form.customerPhone} onChange={(event) => updateField("customerPhone", event.target.value)} error={errors.customerPhone} />
              <Input label="رسوم التوصيل (ر.س)" type="number" min="0" step="any" value={form.deliveryFee} onChange={(event) => updateField("deliveryFee", event.target.value)} error={errors.deliveryFee} />
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-primary">ملاحظات</label>
                <textarea className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20" rows={3} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-primary">أصناف الفاتورة</h2>
              <p className="text-sm text-muted">التكلفة تبدأ تلقائية ويمكن اعتماد تكلفة يدوية لكل صنف.</p>
            </div>
            <Button type="button" onClick={() => setForm((current) => ({ ...current, items: [...current.items, newItem()] }))}>
              <Plus className="h-4 w-4" /> إضافة صنف
            </Button>
          </div>

          {pressureCosts.length === 0 && (
            <div className="rounded-xl bg-accent/10 p-4 text-sm text-primary">لا توجد ضغوط مسجلة. أضف تكلفة ضغط من مركز التكلفة قبل حفظ الفاتورة.</div>
          )}

          {form.items.map((item, index) => {
            const calculated = calculatedItems[index];
            const prefix = `item-${item.id}-`;
            const displayedUnitCost = item.costSource === "manual" ? item.unitCost : calculated ? String(calculated.unitCost) : "";
            return (
              <Card key={item.id} className={`p-4 sm:p-6 ${errors[`item-${item.id}`] ? "border-danger" : ""}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle>الصنف {index + 1}</CardTitle>
                    <p className={`mt-1 text-xs font-medium ${item.costSource === "manual" ? "text-accent" : "text-success"}`}>
                      {item.costSource === "manual" ? "تكلفة معدلة يدويًا" : "تكلفة محسوبة تلقائيًا"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setForm((current) => ({ ...current, items: [...current.items, { ...item, id: crypto.randomUUID() }] }))} aria-label="تكرار الصنف"><Copy className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="sm" disabled={form.items.length === 1} onClick={() => setForm((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== item.id) }))} aria-label="حذف الصنف"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Input label="الارتفاع (سم)" type="number" min="0" step="any" value={item.heightCm} onChange={(event) => updateItem(item.id, "heightCm", event.target.value)} error={errors[prefix + "heightCm"]} />
                  <Input label="العرض (سم)" type="number" min="0" step="any" value={item.widthCm} onChange={(event) => updateItem(item.id, "widthCm", event.target.value)} error={errors[prefix + "widthCm"]} />
                  <Input label="الطول (سم)" type="number" min="0" step="any" value={item.lengthCm} onChange={(event) => updateItem(item.id, "lengthCm", event.target.value)} error={errors[prefix + "lengthCm"]} />
                  <Select label="الضغط" value={item.densityPressure} onChange={(event) => updateItem(item.id, "densityPressure", event.target.value)} error={errors[prefix + "densityPressure"]} options={[{ value: "", label: "اختر الضغط" }, ...pressureCosts.map((cost) => ({ value: String(cost.pressure), label: String(cost.pressure) }))]} />
                  <Input label="الكمية" type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(item.id, "quantity", event.target.value)} error={errors[prefix + "quantity"]} />
                  <Input label="سعر بيع الوحدة (ر.س)" type="number" min="0" step="any" value={item.unitSalePrice} onChange={(event) => updateItem(item.id, "unitSalePrice", event.target.value)} error={errors[prefix + "unitSalePrice"]} />
                  <div className="space-y-2">
                    <Input label="تكلفة الوحدة (ر.س)" type="number" min="0" step="any" value={displayedUnitCost} onChange={(event) => setManualCost(item.id, event.target.value)} error={errors[prefix + "unitCost"]} />
                    {item.costSource === "manual" && (
                      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => resetAutomaticCost(item.id)}>
                        <RefreshCw className="h-4 w-4" /> إعادة احتساب التكلفة
                      </Button>
                    )}
                  </div>
                  <Input label="الوزن كجم (اختياري)" type="number" min="0" step="any" value={item.weightKg} onChange={(event) => updateItem(item.id, "weightKg", event.target.value)} error={errors[prefix + "weightKg"]} />
                </div>
                {calculated && (
                  <div className="mt-4 grid gap-2 rounded-xl bg-background p-3 text-sm sm:grid-cols-3">
                    <span>المبيعات: <b>{formatCurrency(calculated.productSubtotal)}</b></span>
                    <span>التكلفة: <b>{formatCurrency(calculated.totalCost)}</b></span>
                    <span>الربح: <b>{formatCurrency(calculated.netProfit)}</b></span>
                  </div>
                )}
              </Card>
            );
          })}

          {!existingInvoice && (
            <details className="group rounded-3xl border border-border bg-card shadow-sm">
              <summary className="cursor-pointer list-none px-4 py-4 font-bold text-primary sm:px-6">
                <span className="flex items-center justify-between gap-3">
                  تسجيل دفعة أولية - اختياري
                  <span className="text-sm font-normal text-muted group-open:hidden">بدون دفعة</span>
                </span>
              </summary>
              <div className="space-y-4 border-t border-border px-4 py-5 sm:px-6">
                <Select
                  label="حالة السداد عند إنشاء الفاتورة"
                  value={initialPayment.mode}
                  onChange={(event) => {
                    setInitialPayment((current) => ({
                      ...current,
                      mode: event.target.value as InitialPaymentMode,
                    }));
                    setErrors((current) => {
                      const next = { ...current };
                      delete next.initialPaymentAmount;
                      return next;
                    });
                  }}
                  options={[
                    { value: "none", label: "بدون تسجيل دفعة" },
                    { value: "deferred", label: "آجل" },
                    { value: "partial", label: "مدفوع جزئيًا" },
                    { value: "paid", label: "مدفوع بالكامل" },
                  ]}
                />
                {initialPayment.mode === "partial" && (
                  <Input
                    label="المبلغ المدفوع"
                    type="number"
                    min="0"
                    step="any"
                    className="w-full"
                    value={initialPayment.amount}
                    onChange={(event) => {
                      setInitialPayment((current) => ({ ...current, amount: event.target.value }));
                      setErrors((current) => {
                        const next = { ...current };
                        delete next.initialPaymentAmount;
                        return next;
                      });
                    }}
                    error={errors.initialPaymentAmount}
                    required
                  />
                )}
                {(initialPayment.mode === "partial" || initialPayment.mode === "paid") && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select
                      label="طريقة الدفع"
                      value={initialPayment.paymentMethod}
                      onChange={(event) =>
                        setInitialPayment((current) => ({
                          ...current,
                          paymentMethod: event.target.value as InitialPaymentForm["paymentMethod"],
                        }))
                      }
                      options={[
                        { value: "cash", label: "نقدي" },
                        { value: "bank_transfer", label: "تحويل بنكي" },
                        { value: "other", label: "أخرى" },
                      ]}
                    />
                    <Input
                      label="رقم المرجع (اختياري)"
                      value={initialPayment.reference}
                      onChange={(event) =>
                        setInitialPayment((current) => ({ ...current, reference: event.target.value }))
                      }
                    />
                  </div>
                )}
                <div className="grid gap-2 rounded-2xl bg-background p-4 text-sm sm:grid-cols-3">
                  <span>إجمالي الفاتورة <b className="mt-1 block">{formatCurrency(totals.invoiceTotal)}</b></span>
                  <span>الدفعة الأولية <b className="mt-1 block text-success">{formatCurrency(initialPayment.mode === "paid" ? totals.invoiceTotal : initialPayment.mode === "partial" ? Number(initialPayment.amount) || 0 : 0)}</b></span>
                  <span>المتبقي بعد الدفعة <b className="mt-1 block">{formatCurrency(initialPayment.mode === "paid" ? 0 : initialPayment.mode === "partial" ? Math.max(0, totals.invoiceTotal - (Number(initialPayment.amount) || 0)) : totals.invoiceTotal)}</b></span>
                </div>
              </div>
            </details>
          )}
        </div>
        <InvoiceSummary calculations={totals} deliveryFee={Number(form.deliveryFee) || 0} />
      </div>
      <div className="grid gap-3 sm:flex sm:flex-wrap">
        <Button type="submit" size="lg" disabled={saving}>{saving ? "جارٍ الحفظ..." : mode === "edit" ? "تحديث الفاتورة" : "حفظ الفاتورة"}</Button>
        <Button type="button" variant="outline" size="lg" onClick={() => { setForm(initialForm()); setInitialPayment({ mode: "none", amount: "", paymentMethod: "cash", reference: "" }); setErrors({}); }}>مسح الحقول</Button>
        <Link href="/reports" className="contents sm:block"><Button type="button" variant="ghost" size="lg" className="w-full">العودة للتقارير</Button></Link>
      </div>
    </form>
  );
}
