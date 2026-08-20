import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import manifest from "../src/app/manifest";
import type { Lead } from "../src/lib/types/lead";
import { filterLeads, getLeadSourceLabel, normalizeLead, validateLead } from "../src/lib/utils/leads";

const now = "2026-07-22T00:00:00.000Z";
const first: Lead = { id: "1", name: "  أحمد   علي ", phone: "0555-000-111", source: "other", customSource: " مؤتمر ", status: "new", createdAt: now, updatedAt: now };
const normalized = normalizeLead(first);
assert.equal(normalized.name, "أحمد علي");
assert.equal(normalized.phone, "0555000111");
assert.equal(getLeadSourceLabel(normalized), "مؤتمر");
assert.equal(validateLead(normalized, []), undefined);
assert.match(validateLead({ ...normalized, id: "2" }, [normalized]) ?? "", /مسجل/);
const second: Lead = { id: "2", name: "سارة", phone: "+966 50 000 0000", source: "call", status: "contacted", createdAt: now, updatedAt: now };
assert.deepEqual(filterLeads([normalized, second], { query: "سارة", source: "", status: "" }).map((lead) => lead.id), ["2"]);

const pwaManifest = manifest();
assert.equal(pwaManifest.short_name, "FoamSales");
assert.equal(pwaManifest.display, "standalone");
assert.equal(pwaManifest.start_url, "/");
assert.equal(pwaManifest.scope, "/");
for (const file of ["public/sw.js", "public/offline.html", "public/icons/icon-192.png", "public/icons/icon-512.png", "public/icons/icon-maskable-512.png", "public/apple-touch-icon.png"]) assert.ok(existsSync(resolve(file)), `${file} must exist`);
const serviceWorker = readFileSync(resolve("public/sw.js"), "utf8");
assert.match(serviceWorker, /pathname\.startsWith\("\/api\/"\)/);
assert.ok(!serviceWorker.includes("foam_sales_invoices"));
const rootPage = readFileSync(resolve("src/app/page.tsx"), "utf8");
assert.match(rootPage, /CostCalculator/);
assert.ok(!rootPage.includes("HeroSection"));
const header = readFileSync(resolve("src/components/layout/app-header.tsx"), "utf8");
assert.doesNotMatch(header, /authenticated|\/login|\/api\/auth/);
assert.match(header, /const navLinks = \[publicLink, \.\.\.adminLinks\]/);

const balancesPage = readFileSync(resolve("src/app/reports/customer-balances/page.tsx"), "utf8");
const balanceDetailsPage = readFileSync(resolve("src/app/reports/customer-balances/[customer]/page.tsx"), "utf8");
const reportsNav = readFileSync(resolve("src/components/reports/reports-nav.tsx"), "utf8");
for (const source of [balancesPage, balanceDetailsPage, reportsNav]) {
  assert.ok(source.includes("أرصدة العملاء"));
  assert.ok(!source.includes("ميزان العملاء"));
}

const newReceiptPage = readFileSync(resolve("src/app/reports/receipts/new/page.tsx"), "utf8");
const receiptForm = readFileSync(resolve("src/components/reports/receipt-form.tsx"), "utf8");
assert.match(newReceiptPage, /await searchParams/);
assert.match(newReceiptPage, /initialCustomer=\{initialCustomer\}/);
assert.ok(!newReceiptPage.includes("query.amount"));
assert.ok(!receiptForm.includes("window.location.search"));
assert.ok(!receiptForm.includes("new URLSearchParams"));
assert.match(receiptForm, /getCustomerBalance\(customer, invoices, otherReceipts\)/);
assert.match(receiptForm, /amount \?\? \(!existing && customer && balance > 0 \? String\(balance\) : ""\)/);
assert.match(receiptForm, /setAmount\(undefined\)/);

const invoiceForm = readFileSync(resolve("src/components/sales/invoice-form.tsx"), "utf8");
const heightField = invoiceForm.indexOf('label="الارتفاع (سم)"');
const widthField = invoiceForm.indexOf('label="العرض (سم)"');
const lengthField = invoiceForm.indexOf('label="الطول (سم)"');
assert.ok(heightField >= 0 && heightField < widthField && widthField < lengthField);
assert.match(invoiceForm, /!existingInvoice && \(/);
assert.match(invoiceForm, /تسجيل دفعة أولية - اختياري/);
assert.match(invoiceForm, /نسبة حجم القطعة من البلكة القياسية/);
assert.match(invoiceForm, /calculateInvoiceItem/);
const itemsMap = invoiceForm.indexOf("form.items.map");
const addItemButton = invoiceForm.indexOf("إضافة صنف آخر");
const initialPaymentSection = invoiceForm.indexOf("تسجيل دفعة أولية - اختياري");
assert.ok(itemsMap >= 0 && addItemButton > itemsMap && addItemButton < initialPaymentSection);
assert.equal(invoiceForm.match(/إضافة صنف آخر/g)?.length, 1);
const publicCalculator = readFileSync(resolve("src/components/public/cost-calculator.tsx"), "utf8");
assert.match(publicCalculator, /calculateUnitCost/);
const costCalculations = readFileSync(resolve("src/lib/utils/invoice-calculations.ts"), "utf8");
assert.ok(!costCalculations.includes("Math.floor"));

const reportsPage = readFileSync(resolve("src/app/reports/page.tsx"), "utf8");
const invoiceSection = reportsPage.indexOf('id="invoices"');
const summariesSection = reportsPage.indexOf("تقارير المبيعات والأرباح", invoiceSection);
assert.ok(invoiceSection >= 0 && summariesSection > invoiceSection, "invoice register must appear before summaries");
assert.ok(!reportsPage.includes("SalesCharts"));
assert.ok(!reportsPage.includes("exportGeneralReportPdf"));
assert.ok(!reportsPage.includes("exportInvoicesToCsv"));
assert.match(reportsPage, /exportInvoicesToExcel/);

const reportsHeader = readFileSync(resolve("src/components/reports/reports-header.tsx"), "utf8");
assert.match(reportsHeader, /type="search"/);
assert.match(reportsHeader, /onOpenFilters/);
assert.match(reportsHeader, /تصدير Excel/);
assert.ok(!reportsHeader.includes("PDF تقرير عام"));
assert.ok(!reportsHeader.includes("CSV"));

const reportFilters = readFileSync(resolve("src/components/reports/report-filters.tsx"), "utf8");
assert.match(reportFilters, /<Modal/);
for (const action of ["تطبيق", "إعادة ضبط", "إغلاق"]) assert.ok(reportFilters.includes(action));

assert.ok(!existsSync(resolve("src/components/reports/sales-charts.tsx")));
assert.ok(!existsSync(resolve("src/lib/utils/csv-export.ts")));

const migration = readFileSync(resolve("supabase/migrations/001_initial_schema.sql"), "utf8");
const tables = ["pressure_costs", "customers", "invoices", "invoice_items", "customer_receipts", "leads", "audit_logs", "app_meta"];
for (const table of tables) {
  assert.ok(migration.includes(`create table public.${table}`), `${table} table missing`);
  assert.ok(migration.includes(`alter table public.${table} enable row level security`), `${table} RLS missing`);
}
for (const forbidden of ["create table public.profiles", "user_role", "auth.users", "auth.uid()", "current_user_role", "has_role", "handle_new_user"]) assert.ok(!migration.includes(forbidden), `${forbidden} must not exist`);
for (const rpc of ["create_invoice_with_items", "update_invoice_with_items", "soft_delete_invoice", "restore_invoice", "create_customer_receipt", "update_customer_receipt", "soft_delete_customer_receipt", "restore_customer_receipt"]) assert.ok(migration.includes(`function public.${rpc}`), `${rpc} missing`);
assert.match(migration, /source_invoice_id uuid references public\.invoices\(id\) on delete restrict/);
assert.match(migration, /revoke all on all tables in schema public from public, anon, authenticated/);
assert.match(migration, /revoke execute on all functions in schema public from public, anon, authenticated/);
assert.ok(!/create policy/i.test(migration));

const migration2 = readFileSync(resolve("supabase/migrations/002_invoice_initial_payment.sql"), "utf8");
assert.match(migration2, /add value if not exists 'invoice_initial_payment'/);
assert.match(migration2, /function public\.create_invoice_with_initial_payment/);
assert.match(migration2, /pg_advisory_xact_lock/);
assert.match(migration2, /customer_receipts_unique_active_invoice_source/);
assert.match(migration2, /alter column customer_id drop not null/);
assert.match(migration2, /invoice_total_value < receipts_total_value/);

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => { const path = join(directory, name); return statSync(path).isDirectory() ? filesBelow(path) : [path]; });
}
const clientSource = filesBelow(resolve("src")).filter((path) => /\.(ts|tsx)$/.test(path) && !path.includes(`${join("lib", "storage")}`)).map((path) => readFileSync(path, "utf8")).join("\n");
assert.ok(!clientSource.includes("NEXT_PUBLIC_SUPABASE_SECRET_KEY"));
assert.ok(!clientSource.includes("@/lib/storage/"), "operational application code must not import local storage repositories");
assert.match(readFileSync(resolve("src/lib/supabase/server.ts"), "utf8"), /import "server-only"/);
assert.match(readFileSync(resolve("src/lib/supabase/server.ts"), "utf8"), /SUPABASE_SECRET_KEY/);
assert.ok(existsSync(resolve("src/app/api/migrate-local-data/route.ts")));
assert.ok(existsSync(resolve("src/components/data/local-data-migration.tsx")));

console.log("✓ Leads, PWA network-only API policy, single-user SQL security, server-only secret and migration flow verified");
