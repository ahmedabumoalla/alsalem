export type SupabaseAuthErrorDetails = {
  status?: number;
  code?: string;
  message: string;
};

const RATE_LIMIT_CODES = new Set([
  "over_request_rate_limit",
  "over_email_send_rate_limit",
  "over_sms_send_rate_limit",
]);

export function isSupabaseRateLimit(error: SupabaseAuthErrorDetails): boolean {
  return error.status === 429 || Boolean(error.code && RATE_LIMIT_CODES.has(error.code));
}

export function sendOtpErrorResponse(error: SupabaseAuthErrorDetails): Response {
  const rateLimited = isSupabaseRateLimit(error);
  return Response.json(
    { error: rateLimited ? "انتظر دقيقة قبل إعادة إرسال الرمز" : "تعذر إرسال رمز التحقق" },
    {
      status: rateLimited ? 429 : 502,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
