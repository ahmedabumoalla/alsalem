import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const dataRoutes = [
  "src/app/api/customers/route.ts",
  "src/app/api/invoices/route.ts",
  "src/app/api/invoices/[id]/route.ts",
  "src/app/api/invoices/[id]/restore/route.ts",
  "src/app/api/leads/route.ts",
  "src/app/api/leads/[id]/route.ts",
  "src/app/api/migrate-local-data/route.ts",
  "src/app/api/pressure-costs/route.ts",
  "src/app/api/receipts/route.ts",
  "src/app/api/receipts/[id]/route.ts",
  "src/app/api/receipts/[id]/restore/route.ts",
  "src/app/api/reports/route.ts",
];

for (const route of dataRoutes) {
  assert.doesNotMatch(read(route), /requireAuthorized|checkAuthorized|\/login/);
}

for (const removedPath of [
  "src/proxy.ts",
  "src/app/login/page.tsx",
  "src/app/api/auth/send-otp/route.ts",
  "src/app/api/auth/verify-otp/route.ts",
  "src/app/api/auth/session/route.ts",
  "src/app/api/auth/logout/route.ts",
  "src/app/api/auth/hooks/send-sms/route.ts",
  "src/components/auth/login-form.tsx",
  "src/lib/auth/require-authorized-user.ts",
  "src/lib/supabase/auth-server.ts",
  "src/lib/supabase/auth-proxy.ts",
]) {
  assert.equal(existsSync(new URL(`../${removedPath}`, import.meta.url)), false, `${removedPath} must stay removed`);
}

const shellSources = [read("src/app/layout.tsx"), read("src/components/layout/app-header.tsx")].join("\n");
assert.doesNotMatch(shellSources, /authenticated|تسجيل الدخول|تسجيل الخروج|دخول الإدارة|\/api\/auth|\/login/);
assert.match(shellSources, /<AppHeader \/>/);
assert.match(shellSources, /<DataConnectionBanner \/>/);
assert.match(shellSources, /<LocalDataMigration \/>/);

console.log("✓ Open administration access and authentication removal verified");
