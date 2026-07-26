import { loadEnvConfig } from "@next/env";
import { randomInt } from "node:crypto";

async function main() {
  loadEnvConfig(process.cwd());
  if (process.env.GREEN_API_TEST_ALLOW_SEND !== "1") {
    throw new Error("رفض الإرسال الحي. فعّل GREEN_API_TEST_ALLOW_SEND=1 صراحةً.");
  }
  const phone = process.env.ALLOWED_LOGIN_PHONE;
  if (!phone) throw new Error("ALLOWED_LOGIN_PHONE مطلوب.");
  const { sendGreenApiRequest } = await import("../src/lib/green-api/core");
  const apiUrl = process.env.GREEN_API_API_URL?.replace(/\/+$/, "");
  const idInstance = process.env.GREEN_API_ID_INSTANCE;
  const apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE;
  if (!apiUrl || !idInstance || !apiTokenInstance) throw new Error("إعدادات Green API غير مكتملة.");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await sendGreenApiRequest({ apiUrl, idInstance, apiTokenInstance }, phone, code);
  console.log("✓ أُرسلت رسالة تحقق تجريبية واحدة إلى الرقم المسموح دون طباعة الرمز");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "فشل اختبار Green API الحي.");
  process.exitCode = 1;
});
