type FetchLike = typeof fetch;
export const GREEN_API_TIMEOUT_MS = 4_000;

export type GreenApiConfig = {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
};

export class GreenApiTimeoutError extends Error {
  constructor() {
    super("Green API request timed out.");
    this.name = "GreenApiTimeoutError";
  }
}

export class GreenApiSendError extends Error {
  readonly status?: number;

  constructor(status?: number) {
    super("Green API rejected the request.");
    this.name = "GreenApiSendError";
    this.status = status;
  }
}

export function toGreenApiChatId(phone: string): string {
  if (!/^\+9665\d{8}$/.test(phone)) throw new GreenApiSendError();
  return `${phone.slice(1)}@c.us`;
}

export async function sendGreenApiRequest(
  config: GreenApiConfig,
  phone: string,
  code: string,
  fetchImpl: FetchLike = fetch,
  timeoutMs = GREEN_API_TIMEOUT_MS,
): Promise<void> {
  if (!/^\d{6}$/.test(code)) throw new GreenApiSendError();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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
    if (!response.ok || typeof body?.idMessage !== "string" || !body.idMessage) {
      throw new GreenApiSendError(response.status);
    }
  } catch (error) {
    if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw new GreenApiTimeoutError();
    }
    if (error instanceof GreenApiSendError) throw error;
    throw new GreenApiSendError();
  } finally {
    clearTimeout(timeout);
  }
}
