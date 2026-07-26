export function safeNextPath(value: unknown, fallback = "/sales/new"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://foamsales.local");
    if (url.origin !== "https://foamsales.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
