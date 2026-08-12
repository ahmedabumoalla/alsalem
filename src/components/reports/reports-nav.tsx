"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
const links=[{href:"/reports",label:"نظرة عامة"},{href:"/reports#invoices",label:"الفواتير"},{href:"/reports/cost-center",label:"مركز التكلفة"},{href:"/reports/customer-balances",label:"أرصدة العملاء"},{href:"/reports/receipts",label:"سندات القبض"}];
export function ReportsNav(){const path=usePathname();return <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2">{links.map((link)=>{const active=link.href==="/reports"?path===link.href:!link.href.includes("#")&&path.startsWith(link.href);return <Link key={link.href} href={link.href} className={cn("flex min-h-11 shrink-0 items-center rounded-xl px-4 py-2 text-sm font-medium",active?"bg-primary text-white":"text-muted hover:bg-background hover:text-primary")}>{link.label}</Link>})}</nav>}
