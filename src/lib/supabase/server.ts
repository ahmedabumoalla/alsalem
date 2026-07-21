import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";

let serverClient: SupabaseClient<Database> | undefined;

export class SupabaseConfigurationError extends Error {
  constructor() {
    super("اتصال Supabase غير مهيأ. أضف SUPABASE_URL وSUPABASE_SECRET_KEY إلى متغيرات الخادم.");
    this.name = "SupabaseConfigurationError";
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

export function getSupabaseServerClient(): SupabaseClient<Database> {
  if (serverClient) return serverClient;
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new SupabaseConfigurationError();
  serverClient = createClient<Database>(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "foamsales-next-server" },
    },
  });
  return serverClient;
}
