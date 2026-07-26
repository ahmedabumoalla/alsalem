import "server-only";

import { redirect } from "next/navigation";
import { getAllowedLoginPhone, maskPhone, normalizeSaudiPhone } from "@/lib/auth/phone";
import { getSupabaseAuthUser } from "@/lib/supabase/auth-server";

export type AuthorizationResult =
  | { authorized: true; phoneMasked: string }
  | { authorized: false; status: 401 | 403 };

export async function checkAuthorizedUser(): Promise<AuthorizationResult> {
  const user = await getSupabaseAuthUser();
  if (!user) return { authorized: false, status: 401 };
  const phone = normalizeSaudiPhone(user.phone);
  if (!phone || phone !== getAllowedLoginPhone()) return { authorized: false, status: 403 };
  return { authorized: true, phoneMasked: maskPhone(phone) };
}

export async function requireAuthorizedUser(nextPath = "/sales/new") {
  const result = await checkAuthorizedUser();
  if (!result.authorized) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return result;
}

export async function requireAuthorizedApiUser(): Promise<Response | null> {
  const result = await checkAuthorizedUser();
  if (result.authorized) return null;
  return Response.json(
    { error: result.status === 401 ? "يلزم تسجيل الدخول." : "الجلسة غير مصرح بها." },
    { status: result.status, headers: { "Cache-Control": "no-store" } },
  );
}
