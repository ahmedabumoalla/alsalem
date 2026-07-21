"use client";

export const DATA_CHANGED_EVENT = "foamsales:data-changed";
export const DATA_ERROR_EVENT = "foamsales:data-error";

interface ApiEnvelope<T> { data?: T; error?: string }

export class ApiClientError extends Error {
  constructor(message: string, public readonly status = 0) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function requestData<T>(url: string, init?: RequestInit): Promise<T> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new ApiClientError("يلزم الاتصال بالإنترنت لحفظ البيانات أو تحديثها.");
  }
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new ApiClientError("تعذر الاتصال بالخادم. تحقق من الشبكة ثم حاول مرة أخرى.");
  }
  const payload = await response.json().catch(() => ({})) as ApiEnvelope<T>;
  if (!response.ok) throw new ApiClientError(payload.error || "تعذر إكمال الطلب.", response.status);
  return payload.data as T;
}

export function notifyDataChanged(resource: string): void {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: resource }));
}

export function notifyDataError(message: string): void {
  window.dispatchEvent(new CustomEvent(DATA_ERROR_EVENT, { detail: message }));
}
