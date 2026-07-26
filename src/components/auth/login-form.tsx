"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  async function sendOtp(event?: FormEvent) {
    event?.preventDefault();
    if (busy || seconds > 0) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setStep("otp");
      setSeconds(60);
      setMessage(data.message ?? "أرسلنا رمز التحقق إلى واتساب");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إرسال الرمز، حاول لاحقًا");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: token, next: nextPath }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage("تم تسجيل الدخول بنجاح");
      router.replace(data.next);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "رمز التحقق غير صحيح أو منتهي");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={step === "phone" ? sendOtp : verifyOtp} className="space-y-5">
      {step === "phone" ? (
        <>
          <label className="block space-y-2">
            <span className="font-bold">رقم الجوال</span>
            <input dir="ltr" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05XXXXXXXX" className="min-h-12 w-full rounded-xl border border-border bg-white px-4 text-left outline-none focus:border-secondary" required />
          </label>
          <button disabled={busy} className="min-h-12 w-full rounded-xl bg-primary px-5 font-bold text-white disabled:opacity-60">{busy ? "جارٍ الإرسال..." : "إرسال رمز التحقق"}</button>
        </>
      ) : (
        <>
          <label className="block space-y-2">
            <span className="font-bold">رمز التحقق</span>
            <input dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))} className="min-h-14 w-full rounded-xl border border-border bg-white px-4 text-center text-2xl tracking-[0.45em] outline-none focus:border-secondary" required />
          </label>
          <button disabled={busy || token.length !== 6} className="min-h-12 w-full rounded-xl bg-primary px-5 font-bold text-white disabled:opacity-60">{busy ? "جارٍ التحقق..." : "تأكيد الدخول"}</button>
          <div className="flex flex-wrap justify-between gap-3 text-sm">
            <button type="button" disabled={busy || seconds > 0} onClick={() => void sendOtp()} className="font-bold text-secondary disabled:text-muted">
              {seconds > 0 ? `إعادة الإرسال بعد ${seconds} ثانية` : "إعادة إرسال الرمز"}
            </button>
            <button type="button" onClick={() => { setStep("phone"); setToken(""); setMessage(""); }} className="font-bold text-secondary">تغيير الرقم</button>
          </div>
        </>
      )}
      {message && <p role="status" className="rounded-xl bg-background p-3 text-center text-sm">{message}</p>}
    </form>
  );
}
