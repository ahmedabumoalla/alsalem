import { PageContainer } from "@/components/layout/page-container";
import { HeroSection } from "@/components/home/hero-section";
import { StatsOverview } from "@/components/home/stats-overview";
import { FeatureCards } from "@/components/home/feature-cards";

export default function HomePage() {
  return (
    <PageContainer className="space-y-10 sm:space-y-16">
      <HeroSection />
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-primary">نظرة عامة</h2>
          <p className="mt-1 text-muted">إحصائيات حقيقية من الفواتير المسجلة</p>
        </div>
        <StatsOverview />
      </section>
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-primary">المميزات</h2>
          <p className="mt-1 text-muted">كل ما تحتاجه لإدارة مبيعات الفلين</p>
        </div>
        <FeatureCards />
      </section>
    </PageContainer>
  );
}
