import { getAllowedLoginPhone, normalizeSaudiPhone } from "@/lib/auth/phone";
import { createSupabaseAuthClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const phone = normalizeSaudiPhone(body?.phone);
  if (!phone || phone !== getAllowedLoginPhone()) {
    return Response.json({ error: "هذا الرقم غير مصرح له بالدخول" }, { status: 403 });
  }
  try {
    const client = await createSupabaseAuthClient();
    const { error } = await client.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
    return Response.json(
      { success: true, message: "تم إرسال رمز التحقق عبر واتساب" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "تعذر إرسال الرمز، حاول لاحقًا" }, { status: 429 });
  }
}
