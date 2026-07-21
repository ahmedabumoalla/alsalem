import { jsonData, jsonError } from "@/lib/api/route-utils";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) return jsonData({ configured: false, connected: false }, 503);
  try {
    const { error } = await getSupabaseServerClient().from("app_meta").select("key").eq("key", "schema_version").maybeSingle();
    if (error) throw error;
    return jsonData({ configured: true, connected: true });
  } catch (error) {
    return jsonError(error);
  }
}
