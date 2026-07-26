import "server-only";

import { sendGreenApiRequest, toGreenApiChatId } from "@/lib/green-api/core";

function greenApiConfig() {
  const apiUrl = process.env.GREEN_API_API_URL?.replace(/\/+$/, "");
  const idInstance = process.env.GREEN_API_ID_INSTANCE;
  const apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE;
  if (!apiUrl || !idInstance || !apiTokenInstance) throw new Error("إعدادات Green API غير مكتملة.");
  return { apiUrl, idInstance, apiTokenInstance };
}

export { toGreenApiChatId };

export async function sendGreenApiOtp(phone: string, code: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  return sendGreenApiRequest(greenApiConfig(), phone, code, fetchImpl);
}
