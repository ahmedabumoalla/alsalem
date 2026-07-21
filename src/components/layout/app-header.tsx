"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { cn } from "@/lib/utils/cn";

const navLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "/sales/new", label: "إضافة فاتورة" },
  { href: "/reports", label: "التقارير" },
  { href: "/leads", label: "العملاء المحتملون" },
];

export function AppHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = navLinks.map((link) => {
    const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
    return (
      <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className={cn("min-h-11 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", isActive ? "bg-primary text-white" : "text-muted hover:bg-background hover:text-primary")}>{link.label}</Link>
    );
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex min-w-0 flex-col"><span className="text-lg font-extrabold tracking-tight text-primary transition-colors group-hover:text-secondary sm:text-xl">FoamSales</span><span className="hidden text-xs text-muted sm:block">إدارة مبيعات الفلين</span></Link>
        <nav className="hidden items-center gap-1 lg:flex">{links}</nav>
        <div className="flex items-center gap-2"><div className="hidden sm:block"><InstallAppButton /></div><button type="button" onClick={() => setMobileOpen((open) => !open)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-primary lg:hidden" aria-expanded={mobileOpen} aria-controls="mobile-navigation" aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}>{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div>
      </div>
      {mobileOpen && <nav id="mobile-navigation" className="border-t border-border bg-card px-4 py-3 lg:hidden"><div className="mx-auto grid max-w-7xl gap-1">{links}<div className="mt-2 sm:hidden"><InstallAppButton /></div></div></nav>}
    </header>
  );
}
