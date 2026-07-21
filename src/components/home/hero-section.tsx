"use client";

import Link from "next/link";
import { ArrowLeft, TrendingUp, FileText, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";

export function HeroSection() {
  return (
    <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <h1 className="text-2xl font-extrabold leading-tight text-primary sm:text-4xl lg:text-5xl">
          إدارة مبيعات الفلين بوضوح ودقة
        </h1>
        <p className="mt-4 text-base text-muted sm:text-lg">
          سجّل الفواتير واحسب الأرباح وتابع المبيعات والتسليمات من مكان واحد.
        </p>
        <div className="mt-6 flex flex-col gap-3 min-[390px]:flex-row sm:mt-8">
          <Link href="/sales/new">
            <Button size="lg" className="w-full min-[390px]:w-auto">إضافة فاتورة جديدة</Button>
          </Link>
          <Link href="/reports">
            <Button variant="outline" size="lg" className="w-full min-[390px]:w-auto">
              عرض التقارير
            </Button>
          </Link>
        </div>
      </div>

      <Card className="relative overflow-hidden border-secondary/20 bg-gradient-to-br from-card to-background p-0">
        <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-accent/10" />
        <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-secondary/10" />
        <div className="relative space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted">معاينة الفاتورة</p>
                <p className="font-bold text-primary">FS-20260531-A1B2</p>
              </div>
            </div>
            <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
              ربح +18%
            </span>
          </div>

          <div className="rounded-2xl bg-background p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">المقاس</span>
              <span className="font-medium text-primary">200 × 100 × 5 سم</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted">الكمية</span>
              <span className="font-medium text-primary">12 قطعة</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-background p-3">
              <p className="text-xs text-muted">إجمالي الفاتورة</p>
              <p className="mt-1 text-lg font-bold text-primary">
                {formatCurrency(14400)}
              </p>
            </div>
            <div className="rounded-2xl bg-success/10 p-3">
              <p className="flex items-center gap-1 text-xs text-success">
                <TrendingUp className="h-3 w-3" />
                صافي الربح
              </p>
              <p className="mt-1 text-lg font-bold text-success">
                {formatCurrency(2160)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted">
            <Package className="h-4 w-4 text-accent" />
            <span>مثال توضيحي — البيانات الفعلية تظهر بعد تسجيل الفواتير</span>
            <ArrowLeft className="mr-auto h-3 w-3" />
          </div>
        </div>
      </Card>
    </section>
  );
}
