"use client";

import { useEffect, useState } from "react";
import {
  DATA_CHANGED_EVENT,
  notifyDataError,
  requestData,
} from "@/lib/api/client";

export function useRemoteCollection<T>(url: string, resource: string): T[] {
  const [result, setResult] = useState<{ url: string; items: T[] }>({
    url,
    items: [],
  });

  useEffect(() => {
    let active = true;
    let requestController: AbortController | undefined;
    const load = async () => {
      requestController?.abort();
      const controller = new AbortController();
      requestController = controller;
      try {
        const items = await requestData<T[]>(url, { signal: controller.signal });
        if (active) setResult({ url, items });
      } catch (error) {
        if (active && !controller.signal.aborted) {
          notifyDataError(
            error instanceof Error ? error.message : "تعذر تحميل البيانات.",
          );
        }
      }
    };
    queueMicrotask(() => void load());
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (!detail || detail === resource) void load();
    };
    window.addEventListener(DATA_CHANGED_EVENT, changed);
    window.addEventListener("online", load);
    return () => {
      active = false;
      requestController?.abort();
      window.removeEventListener(DATA_CHANGED_EVENT, changed);
      window.removeEventListener("online", load);
    };
  }, [resource, url]);
  return result.url === url ? result.items : [];
}
