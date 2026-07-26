import { normalizeSaudiPhone } from "@/lib/auth/phone";
import { missingEnvironmentNames } from "@/lib/auth/environment";
import { sendOtpErrorResponse, type SupabaseAuthErrorDetails } from "@/lib/auth/send-otp-errors";
import {
  createSupabaseAuthClient,
  SupabaseAuthConfigurationError,
} from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const missing = missingEnvironmentNames([
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "ALLOWED_LOGIN_PHONE",
  ]);
  if (missing.length) {
    console.error("SUPABASE_AUTH_CONFIG_FAILED", { stage: "send-otp-config", missing });
    return Response.json({ error: "إعدادات تسجيل الدخول غير مكتملة" }, { status: 500, headers: noStore });
  }

  const body = await request.json().catch(() => null);
  const phone = normalizeSaudiPhone(body?.phone);
  const allowedPhone = normalizeSaudiPhone(process.env.ALLOWED_LOGIN_PHONE);
  if (!allowedPhone) {
    console.error("SUPABASE_AUTH_CONFIG_FAILED", {
      stage: "allowed-phone-config",
      missing: [],
      message: "ALLOWED_LOGIN_PHONE is invalid",
    });
    return Response.json({ error: "إعدادات تسجيل الدخول غير مكتملة" }, { status: 500, headers: noStore });
  }
  if (!phone || phone !== allowedPhone) {
    return Response.json({ error: "هذا الرقم غير مصرح له بالدخول" }, { status: 403, headers: noStore });
  }

  let client: Awaited<ReturnType<typeof createSupabaseAuthClient>>;
  try {
    client = await createSupabaseAuthClient();
  } catch (error) {
    console.error("SUPABASE_AUTH_CONFIG_FAILED", {
      stage: "create-auth-client",
      missing: error instanceof SupabaseAuthConfigurationError ? error.missing : [],
      message: error instanceof Error ? error.message : "Unknown configuration error",
    });
    return Response.json({ error: "إعدادات تسجيل الدخول غير مكتملة" }, { status: 500, headers: noStore });
  }

  let error: SupabaseAuthErrorDetails | null;
  try {
    ({ error } = await client.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true },
    }));
  } catch (unexpected) {
    console.error("SUPABASE_SEND_OTP_FAILED", {
      stage: "sign-in-with-otp-exception",
      status: undefined,
      code: undefined,
      message: unexpected instanceof Error ? unexpected.message : "Unknown Supabase Auth error",
    });
    return Response.json({ error: "تعذر إرسال رمز التحقق" }, { status: 502, headers: noStore });
  }
  if (error) {
    console.error("SUPABASE_SEND_OTP_FAILED", {
      stage: "sign-in-with-otp",
      status: error.status,
      code: error.code,
      message: error.message,
    });
    return sendOtpErrorResponse(error);
  }

  return Response.json(
    { success: true, message: "تم إرسال رمز التحقق عبر واتساب" },
    { headers: noStore },
  );
}
