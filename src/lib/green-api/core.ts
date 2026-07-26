type FetchLike = typeof fetch;

export type GreenApiConfig = {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
};

export function toGreenApiChatId(phone: string): string {
  if (!/^\+9665\d{8}$/.test(phone)) throw new Error("صيغة رقم واتساب غير صالحة.");
  return `${phone.slice(1)}@c.us`;
}

export async function sendGreenApiRequest(
  config: GreenApiConfig,
  phone: string,
  code: string,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  if (!/^\d{6}$/.test(code)) throw new Error("صيغة رمز التحقق غير صالحة.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetchImpl(
      `${config.apiUrl}/waInstance${encodeURIComponent(config.idInstance)}/sendMessage/${encodeURIComponent(config.apiTokenInstance)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: toGreenApiChatId(phone),
          message: `رمز التحقق لتسجيل الدخول إلى FoamSales هو: ${code}\nصلاحية الرمز محدودة.\nلا تشارك الرمز مع أي شخص.`,
        }),
        signal: controller.signal,
        cache: "no-store",
      },
    );
    const body = await response.json().catch(() => null) as { idMessage?: unknown } | null;
    if (!response.ok || typeof body?.idMessage !== "string" || !body.idMessage) throw new Error("فشل الإرسال");
  } catch {
    throw new Error("تعذر إرسال رمز التحقق عبر واتساب.");
  } finally {
    clearTimeout(timeout);
  }
}
