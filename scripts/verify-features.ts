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
assert.equal(pwaManifest.start_url, "/sales/new");
assert.equal(pwaManifest.scope, "/");
for (const file of ["public/sw.js", "public/offline.html", "public/icons/icon-192.png", "public/icons/icon-512.png", "public/icons/icon-maskable-512.png", "public/apple-touch-icon.png"]) assert.ok(existsSync(resolve(file)), `${file} must exist`);
const serviceWorker = readFileSync(resolve("public/sw.js"), "utf8");
assert.match(serviceWorker, /pathname\.startsWith\("\/api\/"\)/);
assert.ok(!serviceWorker.includes("foam_sales_invoices"));
const rootPage = readFileSync(resolve("src/app/page.tsx"), "utf8");
assert.match(rootPage, /redirect\("\/sales\/new"\)/);
assert.ok(!rootPage.includes("HeroSection"));
const header = readFileSync(resolve("src/components/layout/app-header.tsx"), "utf8");
assert.match(header, /<Link href="\/sales\/new" className="group/);
assert.ok(!header.includes('{ href: "/",'));

const invoiceForm = readFileSync(resolve("src/components/sales/invoice-form.tsx"), "utf8");
const heightField = invoiceForm.indexOf('label="الارتفاع (سم)"');
const widthField = invoiceForm.indexOf('label="العرض (سم)"');
const lengthField = invoiceForm.indexOf('label="الطول (سم)"');
assert.ok(heightField >= 0 && heightField < widthField && widthField < lengthField);
assert.match(invoiceForm, /!existingInvoice && \(/);
assert.match(invoiceForm, /تسجيل دفعة أولية - اختياري/);

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
