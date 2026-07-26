import "server-only";

import { normalizeSaudiPhoneValue } from "@/lib/auth/phone-core";

export function normalizeSaudiPhone(input: unknown): string | null {
  return normalizeSaudiPhoneValue(input);
}

export function getAllowedLoginPhone(): string {
  const phone = normalizeSaudiPhone(process.env.ALLOWED_LOGIN_PHONE);
  if (!phone) throw new Error("متغير ALLOWED_LOGIN_PHONE غير مهيأ بصورة صحيحة.");
  return phone;
}

export function isAllowedLoginPhone(input: unknown): boolean {
  const normalized = normalizeSaudiPhone(input);
  return normalized !== null && normalized === getAllowedLoginPhone();
}

export function maskPhone(input: string): string {
  const normalized = normalizeSaudiPhone(input);
  if (!normalized) return "غير متاح";
  return `05******${normalized.slice(-2)}`;
}
