import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const protectedRoutes = [
  "src/app/api/customers/route.ts", "src/app/api/invoices/route.ts",
  "src/app/api/invoices/[id]/route.ts", "src/app/api/invoices/[id]/restore/route.ts",
  "src/app/api/leads/route.ts", "src/app/api/leads/[id]/route.ts",
  "src/app/api/migrate-local-data/route.ts", "src/app/api/pressure-costs/route.ts",
  "src/app/api/receipts/route.ts", "src/app/api/receipts/[id]/route.ts",
  "src/app/api/receipts/[id]/restore/route.ts", "src/app/api/reports/route.ts",
];
for (const route of protectedRoutes) assert.match(read(route), /requireAuthorizedApiUser/);
for (const layout of ["sales", "reports", "leads"]) {
  assert.match(read(`src/app/${layout}/layout.tsx`), /requireAuthorizedUser/);
}
const sendOtp = read("src/app/api/auth/send-otp/route.ts");
const verifyOtp = read("src/app/api/auth/verify-otp/route.ts");
const hook = read("src/app/api/auth/hooks/send-sms/route.ts");
assert.match(sendOtp, /auth\.signInWithOtp/);
assert.match(sendOtp, /shouldCreateUser: true/);
assert.match(sendOtp, /SUPABASE_AUTH_CONFIG_FAILED/);
assert.match(sendOtp, /SUPABASE_SEND_OTP_FAILED/);
assert.match(sendOtp, /sendOtpErrorResponse/);
assert.match(verifyOtp, /auth\.verifyOtp/);
assert.match(verifyOtp, /type: "sms"/);
assert.match(hook, /verifySupabaseHookSignature/);
assert.match(hook, /ALLOWED_LOGIN_PHONE/);
assert.match(hook, /HOOK_SIGNATURE_INVALID/);
assert.match(hook, /HOOK_PAYLOAD_INVALID/);
assert.match(hook, /HOOK_PHONE_NOT_ALLOWED/);
assert.match(hook, /GREEN_API_SEND_FAILED/);
assert.match(hook, /GREEN_API_TIMEOUT/);
assert.match(read("src/lib/green-api/core.ts"), /GREEN_API_TIMEOUT_MS = 4_000/);
const runtimeSources = [read("src/proxy.ts"), sendOtp, verifyOtp, hook, read("src/lib/auth/require-authorized-user.ts")].join("\n");
assert.doesNotMatch(runtimeSources, /otp_challenges|admin_sessions|OTP_HASH_PEPPER|SESSION_HASH_PEPPER|foamsales_admin_session/);
assert.doesNotMatch(runtimeSources, /Twilio|MessageBird|Vonage/);
assert.match(read("src/app/page.tsx"), /CostCalculator/);
assert.match(read("public/sw.js"), /pathname\.startsWith\("\/api\/"\)/);
assert.doesNotMatch(read(".env.example"), /508424401|OTP_HASH_PEPPER|SESSION_HASH_PEPPER/);
assert.match(read("supabase/migrations/004_remove_custom_otp_sessions.sql"), /drop table if exists public\.admin_sessions/);

console.log("✓ Supabase Phone Auth, signed Send SMS Hook, guards, PWA and cleanup migration verified");
