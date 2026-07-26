const SAUDI_MOBILE = /^5\d{8}$/;

export function normalizeSaudiPhoneValue(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let digits = input.replace(/[\s\-()]/g, "").replace(/^\+/, "");
  if (digits.startsWith("966")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  if (!SAUDI_MOBILE.test(digits)) return null;
  return `+966${digits}`;
}
