import { normalizeSaudiPhone } from "@/lib/auth/phone";
import { missingEnvironmentNames } from "@/lib/auth/environment";
import { verifySupabaseHookSignature } from "@/lib/auth/supabase-hook-signature";
import {
  GreenApiConfigurationError,
  sendGreenApiOtp,
} from "@/lib/green-api/server";
import { GreenApiTimeoutError } from "@/lib/green-api/core";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 32 * 1024;
const noStore = { "Cache-Control": "no-store" };

function errorResponse(status: number) {
  return Response.json(
    { error: { http_code: status, message: "Unable to send verification code." } },
    { status, headers: noStore },
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
    typeof otp === "string" && /^\d{6}$/.test(otp) ? { phone, otp } : null;
}

export async function POST(request: Request) {
  const declaredLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    console.error("HOOK_PAYLOAD_INVALID", { stage: "content-length", status: 413 });
    return errorResponse(413);
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    console.error("HOOK_PAYLOAD_INVALID", { stage: "body-size", status: 413 });
    return errorResponse(413);
  }

  const hookMissing = missingEnvironmentNames(["SUPABASE_SEND_SMS_HOOK_SECRET"]);
  if (hookMissing.length) {
    console.error("HOOK_SIGNATURE_INVALID", { stage: "hook-config", missing: hookMissing, status: 401 });
    return errorResponse(401);
  }
  const validSignature = verifySupabaseHookSignature({
    rawBody,
    webhookId: request.headers.get("webhook-id"),
    webhookTimestamp: request.headers.get("webhook-timestamp"),
    webhookSignature: request.headers.get("webhook-signature"),
    secret: process.env.SUPABASE_SEND_SMS_HOOK_SECRET,
  });
  if (!validSignature) {
    console.error("HOOK_SIGNATURE_INVALID", { stage: "signature", status: 401 });
    return errorResponse(401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("HOOK_PAYLOAD_INVALID", { stage: "json", status: 400 });
    return errorResponse(400);
  }
  const parsed = parseHookPayload(payload);
  if (!parsed) {
    console.error("HOOK_PAYLOAD_INVALID", { stage: "schema", status: 400 });
    return errorResponse(400);
  }

  const allowedMissing = missingEnvironmentNames(["ALLOWED_LOGIN_PHONE"]);
  const phone = normalizeSaudiPhone(parsed.phone);
  const allowedPhone = normalizeSaudiPhone(process.env.ALLOWED_LOGIN_PHONE);
  if (allowedMissing.length || !allowedPhone || !phone || phone !== allowedPhone) {
    console.error("HOOK_PHONE_NOT_ALLOWED", {
      stage: allowedMissing.length ? "phone-config" : "phone-check",
      missing: allowedMissing,
      status: 403,
    });
    return errorResponse(403);
  }

  try {
    await sendGreenApiOtp(phone, parsed.otp);
    return Response.json({}, { status: 200, headers: noStore });
  } catch (error) {
    if (error instanceof GreenApiTimeoutError) {
      console.error("GREEN_API_TIMEOUT", { stage: "green-api-send", status: 502 });
    } else {
      console.error("GREEN_API_SEND_FAILED", {
        stage: "green-api-send",
        status: 502,
        missing: error instanceof GreenApiConfigurationError ? error.missing : [],
        message: error instanceof Error ? error.message : "Unknown Green API error",
      });
    }
    return errorResponse(502);
  }
}
