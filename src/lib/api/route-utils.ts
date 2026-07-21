import "server-only";

import { DataAccessError } from "@/lib/data/errors";
import { SupabaseConfigurationError } from "@/lib/supabase/server";

export const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" };

export function jsonData<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status, headers: NO_STORE_HEADERS });
}

export function jsonError(error: unknown): Response {
  if (error instanceof SupabaseConfigurationError) return Response.json({ error: error.message, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503, headers: NO_STORE_HEADERS });
  if (error instanceof DataAccessError) {
    const status = error.code === "23505" ? 409 : error.code === "P0002" ? 404 : error.code === "22023" ? 422 : 500;
    return Response.json({ error: error.message, code: error.code }, { status, headers: NO_STORE_HEADERS });
  }
  const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع في الخادم.";
  return Response.json({ error: message }, { status: 400, headers: NO_STORE_HEADERS });
}

export async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new Error("يجب إرسال الطلب بصيغة JSON.");
  return request.json();
}
