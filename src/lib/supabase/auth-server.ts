import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database";
import { missingEnvironmentNames } from "@/lib/auth/environment";

export class SupabaseAuthConfigurationError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super("إعدادات Supabase Auth غير مكتملة.");
    this.name = "SupabaseAuthConfigurationError";
    this.missing = missing;
  }
}

export function authConfig() {
  const missing = missingEnvironmentNames(["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"]);
  if (missing.length) throw new SupabaseAuthConfigurationError(missing);
  return {
    url: process.env.SUPABASE_URL as string,
    key: process.env.SUPABASE_PUBLISHABLE_KEY as string,
  };
}

export async function createSupabaseAuthClient() {
  const { url, key } = authConfig();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write response cookies; proxy refreshes them.
        }
      },
    },
  });
}

export async function getSupabaseAuthUser() {
  try {
    const client = await createSupabaseAuthClient();
    const { data, error } = await client.auth.getUser();
    return error ? null : data.user;
  } catch {
    return null;
  }
}
