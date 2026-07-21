"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DATA_CHANGED_EVENT,
  notifyDataError,
  requestData,
} from "@/lib/api/client";

export function useRemoteCollection<T>(url: string, resource: string): T[] {
  const [items, setItems] = useState<T[]>([]);
  const load = useCallback(async () => {
    try {
      setItems(await requestData<T[]>(url));
    } catch (error) {
      notifyDataError(
        error instanceof Error ? error.message : "تعذر تحميل البيانات.",
      );
    }
  }, [url]);

  useEffect(() => {
    queueMicrotask(() => void load());
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (!detail || detail === resource) void load();
    };
    window.addEventListener(DATA_CHANGED_EVENT, changed);
    window.addEventListener("online", load);
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, changed);
      window.removeEventListener("online", load);
    };
  }, [load, resource]);
  return items;
}
