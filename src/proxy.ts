import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseAuthSession } from "@/lib/supabase/auth-proxy";

const PUBLIC_PATHS = new Set(["/", "/login", "/offline.html", "/manifest.webmanifest", "/sw.js", "/api/health"]);

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_PATHS.has(path) ||
    path.startsWith("/api/auth/") ||
    path.startsWith("/_next/") ||
    path.startsWith("/icons/") ||
    path.startsWith("/fonts/") ||
    /\.[a-z0-9]+$/i.test(path);

  const response = await updateSupabaseAuthSession(request);
  if (isPublic) return response;

  const hasSupabaseCookie = request.cookies.getAll().some(({ name }) => name.startsWith("sb-"));
  if (hasSupabaseCookie) return response;
  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "يلزم تسجيل الدخول." }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${path}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
