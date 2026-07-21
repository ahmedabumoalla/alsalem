"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast-provider";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isIosSafari(): boolean {
  const userAgent = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(userAgent);
  const webkit = /WebKit/.test(userAgent);
  const alternativeBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return ios && webkit && !alternativeBrowser;
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

function subscribeInstallState(listener: () => void): () => void {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", listener);
  window.addEventListener("appinstalled", listener);
  return () => {
    media.removeEventListener("change", listener);
    window.removeEventListener("appinstalled", listener);
  };
}

export function InstallAppButton() {
  const { showToast } = useToast();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const installed = useSyncExternalStore(subscribeInstallState, isStandalone, () => false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setPromptEvent(null);
      showToast("تم تثبيت FoamSales بنجاح");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [showToast]);

  const install = async () => {
    if (installed) {
      showToast("التطبيق مثبت بالفعل");
      return;
    }
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setPromptEvent(null);
      return;
    }
    if (isIosSafari()) {
      setShowIosHelp(true);
      return;
    }
    showToast("استخدم خيار تثبيت التطبيق من قائمة المتصفح عند ظهوره", "error");
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={install} className="whitespace-nowrap" aria-label="تثبيت التطبيق">
        <Download className="h-4 w-4" />
        <span>{installed ? "مثبت" : "تثبيت التطبيق"}</span>
      </Button>
      <Modal open={showIosHelp} onClose={() => setShowIosHelp(false)} title="تثبيت FoamSales على iPhone أو iPad">
        <ol className="space-y-4 text-sm">
          <li className="flex gap-3"><Share className="h-5 w-5 shrink-0 text-secondary" /><span>اضغط زر المشاركة في شريط Safari.</span></li>
          <li className="flex gap-3"><SquarePlus className="h-5 w-5 shrink-0 text-secondary" /><span>اختر «إضافة إلى الشاشة الرئيسية» ثم أكّد الإضافة.</span></li>
        </ol>
      </Modal>
    </>
  );
}
