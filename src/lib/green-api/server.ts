import "server-only";

import { missingEnvironmentNames } from "@/lib/auth/environment";
import { sendGreenApiRequest, toGreenApiChatId } from "@/lib/green-api/core";

export class GreenApiConfigurationError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super("إعدادات Green API غير مكتملة.");
    this.name = "GreenApiConfigurationError";
    this.missing = missing;
  }
}

export function greenApiConfig() {
  const missing = missingEnvironmentNames([
    "GREEN_API_API_URL",
    "GREEN_API_ID_INSTANCE",
    "GREEN_API_TOKEN_INSTANCE",
  ]);
  if (missing.length) throw new GreenApiConfigurationError(missing);
  return {
    apiUrl: (process.env.GREEN_API_API_URL as string).replace(/\/+$/, ""),
    idInstance: process.env.GREEN_API_ID_INSTANCE as string,
    apiTokenInstance: process.env.GREEN_API_TOKEN_INSTANCE as string,
  };
}

export { toGreenApiChatId };

export async function sendGreenApiOtp(phone: string, code: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  return sendGreenApiRequest(greenApiConfig(), phone, code, fetchImpl);
}
