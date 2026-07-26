import { getAllowedLoginPhone, normalizeSaudiPhone } from "@/lib/auth/phone";
import { safeNextPath } from "@/lib/auth/safe-next";
import { createSupabaseAuthClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const phone = normalizeSaudiPhone(body?.phone);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!phone || phone !== getAllowedLoginPhone()) {
    return Response.json({ error: "هذا الرقم غير مصرح له بالدخول" }, { status: 403 });
  }
  if (!/^\d{6}$/.test(code)) {
    return Response.json({ error: "رمز التحقق غير صحيح أو منتهي" }, { status: 400 });
  }
  const client = await createSupabaseAuthClient();
  const { data, error } = await client.auth.verifyOtp({ phone, token: code, type: "sms" });
  if (error || !data.user || normalizeSaudiPhone(data.user.phone) !== getAllowedLoginPhone()) {
    if (data.session) await client.auth.signOut();
    return Response.json({ error: "رمز التحقق غير صحيح أو منتهي" }, { status: error ? 400 : 403 });
  }
  return Response.json(
    { message: "تم تسجيل الدخول بنجاح", next: safeNextPath(body?.next) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
