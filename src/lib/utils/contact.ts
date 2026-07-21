export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  const hasInternationalPrefix = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasInternationalPrefix && digits ? `+${digits}` : digits;
}

export function isValidOptionalPhone(phone: string): boolean {
  if (!phone.trim()) return true;
  const normalized = normalizePhone(phone);
  return /^\+?\d{7,15}$/.test(normalized);
}
