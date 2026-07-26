import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { sendGreenApiRequest, toGreenApiChatId } from "../src/lib/green-api/core";
import { normalizeSaudiPhoneValue } from "../src/lib/auth/phone-core";
import { verifySupabaseHookSignature } from "../src/lib/auth/supabase-hook-signature-core";
import { missingEnvironmentNames } from "../src/lib/auth/environment";
import { isSupabaseRateLimit, sendOtpErrorResponse } from "../src/lib/auth/send-otp-errors";
import { GreenApiSendError, GreenApiTimeoutError } from "../src/lib/green-api/core";

async function main() {
  const secretBytes = Buffer.from("foamsales-hook-test-secret-at-least-32-bytes", "utf8");
  const secret = `v1,whsec_${secretBytes.toString("base64")}`;
  const rawBody = JSON.stringify({
    user: { phone: "+966500000000" },
    sms: { otp: "012345" },
  });
  const webhookId = "foam-hook-test";
  const webhookTimestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secretBytes)
    .update(`${webhookId}.${webhookTimestamp}.${rawBody}`)
    .digest("base64");
  assert.equal(verifySupabaseHookSignature({
    rawBody, webhookId, webhookTimestamp,
    webhookSignature: `v1,${signature}`, secret,
  }), true);
  assert.equal(verifySupabaseHookSignature({
    rawBody, webhookId, webhookTimestamp,
    webhookSignature: "v1,invalid", secret,
  }), false);

  assert.equal(isSupabaseRateLimit({ status: 429, message: "limited" }), true);
  assert.equal(isSupabaseRateLimit({ code: "over_sms_send_rate_limit", message: "limited" }), true);
  assert.equal(isSupabaseRateLimit({ status: 500, code: "hook_failed", message: "failed" }), false);
  const rateResponse = sendOtpErrorResponse({ status: 429, message: "internal rate message" });
  assert.equal(rateResponse.status, 429);
  assert.equal(rateResponse.headers.get("cache-control"), "no-store");
  assert.deepEqual(await rateResponse.json(), { error: "انتظر دقيقة قبل إعادة إرسال الرمز" });
  const upstreamResponse = sendOtpErrorResponse({ status: 500, code: "hook_failed", message: "sensitive" });
  assert.equal(upstreamResponse.status, 502);
  assert.equal(upstreamResponse.headers.get("cache-control"), "no-store");
  assert.deepEqual(await upstreamResponse.json(), { error: "تعذر إرسال رمز التحقق" });
  assert.deepEqual(
    missingEnvironmentNames(["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"], { SUPABASE_URL: "url" }),
    ["SUPABASE_PUBLISHABLE_KEY"],
  );
  assert.equal(verifySupabaseHookSignature({
    rawBody, webhookId, webhookTimestamp: "1",
    webhookSignature: `v1,${signature}`, secret,
  }), false);

  const phone = "+966500000000";
  assert.equal(normalizeSaudiPhoneValue("0500000000"), phone);
  assert.equal(normalizeSaudiPhoneValue("500000000"), phone);
  assert.equal(normalizeSaudiPhoneValue("966500000000"), phone);
  assert.equal(normalizeSaudiPhoneValue(phone), phone);
  assert.equal(toGreenApiChatId(phone), "966500000000@c.us");

  let requestUrl = "";
  let requestBody: { chatId?: string; message?: string } = {};
  const mockFetch: typeof fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ idMessage: "mock-message-id" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const config = {
    apiUrl: "https://api.green-api.test",
    idInstance: "instance-id",
    apiTokenInstance: "instance-token",
  };
  await sendGreenApiRequest(config, phone, "012345", mockFetch);
  assert.equal(requestUrl, "https://api.green-api.test/waInstanceinstance-id/sendMessage/instance-token");
  assert.equal(requestBody.chatId, "966500000000@c.us");
  assert.match(requestBody.message ?? "", /012345/);
  await assert.rejects(
    () => sendGreenApiRequest(config, phone, "012345", async () => new Response("{}", { status: 500 })),
    GreenApiSendError,
  );
  await assert.rejects(
    () => sendGreenApiRequest(
      config,
      phone,
      "012345",
      async (_input, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }),
      10,
    ),
    GreenApiTimeoutError,
  );

  console.log("✓ Supabase Hook signature and Green API mock verified without sending messages");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Green API mock failed");
  process.exitCode = 1;
});
