import { getAllowedLoginPhone, normalizeSaudiPhone } from "@/lib/auth/phone";
import { verifySupabaseHookSignature } from "@/lib/auth/supabase-hook-signature";
import { sendGreenApiOtp } from "@/lib/green-api/server";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 32 * 1024;

function errorResponse(status: number) {
  return Response.json(
    { error: { http_code: status, message: "Unable to send verification code." } },
    { status },
  );
}

function parseHookPayload(value: unknown): { phone: string; otp: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const user = record.user;
  const sms = record.sms;
  if (!user || typeof user !== "object" || Array.isArray(user) ||
      !sms || typeof sms !== "object" || Array.isArray(sms)) return null;
  const phone = (user as Record<string, unknown>).phone;
  const otp = (sms as Record<string, unknown>).otp;
  return typeof phone === "string" && phone.length <= 32 &&
    typeof otp === "string" && /^\d{6}$/.test(otp)
    ? { phone, otp }
    : null;
}

export async function POST(request: Request) {
  const declaredLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return errorResponse(413);
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) return errorResponse(413);

  const validSignature = verifySupabaseHookSignature({
    rawBody,
    webhookId: request.headers.get("webhook-id"),
    webhookTimestamp: request.headers.get("webhook-timestamp"),
    webhookSignature: request.headers.get("webhook-signature"),
    secret: process.env.SUPABASE_SEND_SMS_HOOK_SECRET,
  });
  if (!validSignature) return errorResponse(401);

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return errorResponse(400);
  }
  const parsed = parseHookPayload(payload);
  if (!parsed) return errorResponse(400);
  const phone = normalizeSaudiPhone(parsed.phone);
  if (!phone || phone !== getAllowedLoginPhone()) return errorResponse(403);

  try {
    await sendGreenApiOtp(phone, parsed.otp);
    return Response.json({}, { status: 200 });
  } catch {
    return errorResponse(502);
  }
}
