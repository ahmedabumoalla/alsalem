import { checkAuthorizedUser } from "@/lib/auth/require-authorized-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await checkAuthorizedUser();
  return Response.json(
    result.authorized
      ? { authenticated: true, phoneMasked: result.phoneMasked }
      : { authenticated: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}
