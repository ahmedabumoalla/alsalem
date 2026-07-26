"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut, Menu, X } from "lucide-react";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { cn } from "@/lib/utils/cn";

const adminLinks = [
  { href: "/sales/new", label: "إضافة فاتورة" },
  { href: "/reports", label: "التقارير" },
  { href: "/leads", label: "العملاء المحتملون" },
];

export function AppHeader({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navLinks = authenticated ? adminLinks : [{ href: "/", label: "حاسبة التكلفة" }];
  const links = navLinks.map((link) => (
    <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
      className={cn("min-h-11 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href)) ? "bg-primary text-white" : "text-muted hover:bg-background hover:text-primary")}>
      {link.label}
    </Link>
  ));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href={authenticated ? "/sales/new" : "/"} className="group flex min-w-0 flex-col">
          <span className="text-lg font-extrabold tracking-tight text-primary transition-colors group-hover:text-secondary sm:text-xl">FoamSales</span>
          <span className="hidden text-xs text-muted sm:block">{authenticated ? "إدارة مبيعات الفلين" : "حاسبة تكلفة الفلين"}</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">{links}</nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block"><InstallAppButton /></div>
          {authenticated ? (
            <form action="/api/auth/logout" method="post">
              <button className="hidden min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold text-primary sm:flex"><LogOut className="h-4 w-4" />تسجيل الخروج</button>
            </form>
          ) : (
            <Link href="/login" className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-white"><LogIn className="h-4 w-4" />دخول الإدارة</Link>
          )}
          <button type="button" onClick={() => setMobileOpen((open) => !open)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-primary lg:hidden" aria-expanded={mobileOpen} aria-controls="mobile-navigation" aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav id="mobile-navigation" className="border-t border-border bg-card px-4 py-3 lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-1">
            {links}
            {authenticated && <form action="/api/auth/logout" method="post" className="sm:hidden"><button className="min-h-11 w-full rounded-xl px-3 text-right text-sm font-bold text-danger">تسجيل الخروج</button></form>}
            <div className="mt-2 sm:hidden"><InstallAppButton /></div>
          </div>
        </nav>
      )}
    </header>
  );
}
