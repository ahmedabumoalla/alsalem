import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase/auth-server";

export async function POST(request: Request) {
  try {
    const client = await createSupabaseAuthClient();
    await client.auth.signOut();
  } catch {
    // Logout remains idempotent when the session or configuration is unavailable.
  }
  return NextResponse.redirect(new URL("/", request.url), 303);
}
