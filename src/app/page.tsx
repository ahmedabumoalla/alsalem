import { CostCalculator, type PublicPressureCost } from "@/components/public/cost-calculator";
import { listPressureCosts } from "@/lib/data/pressure-costs-repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let costs: PublicPressureCost[] = [];
  let failed = false;
  try {
    costs = (await listPressureCosts()).map(({ pressure, standardBlockCost, standardLengthCm, standardWidthCm, standardHeightCm, updatedAt }) => ({
      pressure, standardBlockCost, standardLengthCm, standardWidthCm, standardHeightCm, updatedAt,
    }));
  } catch {
    failed = true;
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <section className="mb-8 max-w-3xl">
        <p className="text-sm font-extrabold text-secondary">FoamSales</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">حاسبة تكلفة الفلين</h1>
        <p className="mt-3 text-muted">احسب التكلفة التقديرية لأي قطعة فلين بحسب أبعادها وضغطها، باستخدام أحدث تكلفة مسجلة للبلك القياسي.</p>
      </section>
      {failed || costs.length === 0 ? (
        <div className="rounded-2xl border border-danger/30 bg-card p-5 text-danger">تعذر تحميل أسعار التكلفة. الاتصال بالإنترنت مطلوب.</div>
      ) : <CostCalculator costs={costs} />}
    </div>
  );
}
