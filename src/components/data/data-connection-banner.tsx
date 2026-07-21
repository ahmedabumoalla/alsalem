"use client";

import { useCallback, useEffect, useState } from "react";
import { DATA_ERROR_EVENT } from "@/lib/api/client";

interface Health {
  configured: boolean;
  connected: boolean;
}

export function DataConnectionBanner() {
  const [message, setMessage] = useState("");
  const check = useCallback(async () => {
    if (!navigator.onLine) {
      setMessage(
        "أنت غير متصل بالإنترنت. يمكن تصفح واجهة التطبيق، لكن يلزم الاتصال لتحميل البيانات أو حفظها.",
      );
      return;
    }
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const envelope = (await response.json()) as {
        data?: Health;
        error?: string;
      };
      if (envelope.data?.connected) setMessage("");
      else if (envelope.data && !envelope.data.configured)
        setMessage(
          "اتصال Supabase غير مهيأ على الخادم. أضف متغيري الاتصال السريين الموضحين في ملف .env.example ثم أعد التشغيل.",
        );
      else setMessage(envelope.error || "تعذر الاتصال بقاعدة البيانات.");
    } catch {
      setMessage(
        "تعذر الوصول إلى خادم FoamSales. تحقق من الاتصال ثم حاول مرة أخرى.",
      );
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void check());
    const dataError = (event: Event) =>
      setMessage((event as CustomEvent<string>).detail);
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    window.addEventListener(DATA_ERROR_EVENT, dataError);
    return () => {
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
      window.removeEventListener(DATA_ERROR_EVENT, dataError);
    };
  }, [check]);
  if (!message) return null;
  return (
    <div
      role="alert"
      className="border-b border-danger/30 bg-danger/10 px-4 py-2 text-center text-sm font-medium text-danger"
    >
      {message}
    </div>
  );
}
