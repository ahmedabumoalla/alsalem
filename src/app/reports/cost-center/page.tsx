"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Trash2, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast-provider";
import { usePressureCosts } from "@/lib/hooks/use-pressure-costs";
import { deletePressureCost, savePressureCost } from "@/lib/api/records-client";
import type { FoamPressureCost } from "@/lib/types/pressure-cost";
import { STANDARD_BLOCK_VOLUME_CM3 } from "@/lib/utils/invoice-calculations";
import { formatCurrency } from "@/lib/utils/format";

export default function CostCenterPage() {
  const costs = usePressureCosts();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<FoamPressureCost | null>(null);
  const [pressure, setPressure] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<FoamPressureCost | null>(null);
  const sorted = [...costs].sort(
    (left, right) => left.pressure - right.pressure,
  );

  const reset = () => {
    setEditing(null);
    setPressure("");
    setCost("");
    setError("");
  };
  const edit = (item: FoamPressureCost) => {
    setEditing(item);
    setPressure(String(item.pressure));
    setCost(String(item.standardBlockCost));
    setError("");
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const now = new Date().toISOString();
      await savePressureCost({
        id: editing?.id ?? crypto.randomUUID(),
        pressure: Number(pressure),
        standardBlockCost: Number(cost),
        standardLengthCm: editing?.standardLengthCm ?? 100,
        standardWidthCm: editing?.standardWidthCm ?? 120,
        standardHeightCm: editing?.standardHeightCm ?? 400,
        createdAt: editing?.createdAt ?? now,
        updatedAt: now,
      });
      showToast(editing ? "تم تحديث تكلفة الضغط" : "تمت إضافة تكلفة الضغط");
      reset();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "تعذر حفظ التكلفة";
      setError(message);
      showToast(message, "error");
    }
  };

  const actions = (item: FoamPressureCost) => (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-label="تعديل"
        onClick={() => edit(item)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label="حذف"
        onClick={() => setDeleting(item)}
      >
        <Trash2 className="h-4 w-4 text-danger" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">
          مركز التكلفة
        </h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          تكلفة البلك القياسي لكل ضغط، وتُستخدم تلقائيًا في الفواتير.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>المقاس القياسي الثابت</CardTitle>
        </CardHeader>
        <p className="font-bold text-primary" dir="ltr">
          100 × 120 × 400 cm ={" "}
          {STANDARD_BLOCK_VOLUME_CM3.toLocaleString("en-US")} cm³
        </p>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "تعديل تكلفة ضغط" : "إضافة ضغط"}</CardTitle>
        </CardHeader>
        <form onSubmit={submit} className="grid items-end gap-4 sm:grid-cols-3">
          <Input
            label="الضغط"
            type="number"
            min="0"
            step="any"
            value={pressure}
            onChange={(event) => setPressure(event.target.value)}
            required
          />
          <Input
            label="تكلفة البلك القياسي (ر.س)"
            type="number"
            min="0"
            step="any"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            required
          />
          <div className="flex flex-col gap-2 min-[390px]:flex-row">
            <Button type="submit">{editing ? "حفظ التعديل" : "إضافة"}</Button>
            {editing && (
              <Button type="button" variant="outline" onClick={reset}>
                إلغاء
              </Button>
            )}
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Card>
      {costs.length === 0 ? (
        <EmptyState
          icon={<Warehouse className="h-8 w-8" />}
          title="لا توجد تكاليف مسجلة"
          description="أضف ضغطًا وتكلفة البلك القياسي لبدء احتساب تكلفة الأصناف."
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {sorted.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <b className="text-primary">ضغط {item.pressure}</b>
                  {actions(item)}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted">تكلفة البلك</dt>
                    <dd className="font-bold">
                      {formatCurrency(item.standardBlockCost)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">تكلفة م³</dt>
                    <dd>{formatCurrency(item.standardBlockCost / 4.8)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-3xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-background">
                <tr>
                  {[
                    "الضغط",
                    "تكلفة البلك",
                    "تكلفة المتر المكعب",
                    "إجراءات",
                  ].map((heading) => (
                    <th key={heading} className="p-4 text-right">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="p-4 font-bold">{item.pressure}</td>
                    <td className="p-4">
                      {formatCurrency(item.standardBlockCost)}
                    </td>
                    <td className="p-4">
                      {formatCurrency(item.standardBlockCost / 4.8)}
                    </td>
                    <td className="p-4">{actions(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="تأكيد الحذف"
      >
        <p className="text-muted">
          هل تريد حذف تكلفة الضغط {deleting?.pressure}؟
        </p>
        <div className="mt-6 flex flex-col gap-2 min-[390px]:flex-row">
          <Button
            variant="danger"
            onClick={async () => {
              if (deleting) {
                try {
                  await deletePressureCost(deleting.id);
                  showToast("تم حذف تكلفة الضغط");
                  setDeleting(null);
                } catch (deleteError) {
                  showToast(
                    deleteError instanceof Error
                      ? deleteError.message
                      : "تعذر حذف تكلفة الضغط",
                    "error",
                  );
                }
              }
            }}
          >
            تأكيد الحذف
          </Button>
          <Button variant="outline" onClick={() => setDeleting(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  );
}
