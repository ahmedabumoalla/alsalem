import { Zap, Calculator, BarChart3 } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Zap,
    title: "تسجيل سريع للفواتير",
    description: "إدخال المقاسات والكميات والأسعار بسهولة.",
    color: "text-accent bg-accent/10",
  },
  {
    icon: Calculator,
    title: "حساب تلقائي للأرباح",
    description: "معرفة صافي الربح وهامش الربح فورًا.",
    color: "text-secondary bg-secondary/10",
  },
  {
    icon: BarChart3,
    title: "تقارير دقيقة",
    description: "متابعة المبيعات والبائعين وطرق السداد.",
    color: "text-primary bg-primary/10",
  },
];

export function FeatureCards() {
  return (
    <section className="grid gap-6 md:grid-cols-3">
      {features.map((feature) => {
        const Icon = feature.icon;
        return (
          <Card key={feature.title} className="transition-shadow hover:shadow-md">
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${feature.color}`}
            >
              <Icon className="h-6 w-6" />
            </div>
            <CardTitle>{feature.title}</CardTitle>
            <CardDescription className="mt-2">{feature.description}</CardDescription>
          </Card>
        );
      })}
    </section>
  );
}
