"use client";

import { useMemo } from "react";
import { FileText, SaudiRiyal, TrendingUp, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { formatCurrency, formatNumber } from "@/lib/utils/format";

const statCards = [
  {
    key: "invoiceCount" as const,
    label: "إجمالي الفواتير",
    icon: FileText,
    format: (v: number) => formatNumber(v, 0),
    color: "text-primary bg-primary/10",
  },
  {
    key: "totalSales" as const,
    label: "إجمالي المبيعات",
    icon: SaudiRiyal,
    format: (v: number) => formatCurrency(v),
    color: "text-secondary bg-secondary/10",
  },
  {
    key: "totalProfit" as const,
    label: "إجمالي الأرباح",
    icon: TrendingUp,
    format: (v: number) => formatCurrency(v),
    color: "text-success bg-success/10",
  },
  {
    key: "totalQuantity" as const,
    label: "عدد القطع المباعة",
    icon: Package,
    format: (v: number) => formatNumber(v, 0),
    color: "text-accent bg-accent/10",
  },
];

export function StatsOverview() {
  const invoices = useInvoices();

  const stats = useMemo(
    () => ({
      invoiceCount: invoices.length,
      totalSales: invoices.reduce((s, i) => s + i.invoiceTotal, 0),
      totalProfit: invoices.reduce((s, i) => s + i.netProfit, 0),
      totalQuantity: invoices.reduce(
        (sum, invoice) =>
          sum + invoice.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      ),
    }),
    [invoices]
  );

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key} className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${card.color}`}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {card.format(stats[card.key])}
              </p>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
