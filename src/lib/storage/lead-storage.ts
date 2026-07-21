import type { Lead } from "@/lib/types/lead";
import { LEADS_STORAGE_KEY } from "@/lib/types/lead";
import { notifyStorageKey, subscribeStorageKey } from "@/lib/storage/storage-events";
import { normalizeLead, validateLead } from "@/lib/utils/leads";

const EMPTY: Lead[] = [];
let cachedRaw: string | null | undefined;
let cached: Lead[] = EMPTY;

function isLead(value: unknown): value is Lead {
  if (!value || typeof value !== "object") return false;
  const lead = value as Partial<Lead>;
  return (
    typeof lead.id === "string" &&
    typeof lead.name === "string" &&
    typeof lead.phone === "string" &&
    ["call", "whatsapp", "visit", "referral", "ad", "exhibition", "website", "other"].includes(lead.source ?? "") &&
    ["new", "contacted", "interested", "converted", "not_interested"].includes(lead.status ?? "") &&
    typeof lead.createdAt === "string" &&
    typeof lead.updatedAt === "string"
  );
}

export function getLeadsSnapshot(): Lead[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = localStorage.getItem(LEADS_STORAGE_KEY);
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cached = Array.isArray(parsed) ? parsed.filter(isLead).map(normalizeLead) : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

export function getServerLeadsSnapshot(): Lead[] {
  return EMPTY;
}

export function subscribeLeads(listener: () => void): () => void {
  return subscribeStorageKey(LEADS_STORAGE_KEY, listener);
}

function write(leads: Lead[]): void {
  localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
  cachedRaw = undefined;
  notifyStorageKey(LEADS_STORAGE_KEY);
}

export function saveLead(value: Lead): void {
  const current = getLeadsSnapshot();
  const lead = normalizeLead(value);
  const error = validateLead(lead, current);
  if (error) throw new Error(error);
  const exists = current.some((item) => item.id === lead.id);
  write(
    exists
      ? current.map((item) => (item.id === lead.id ? lead : item))
      : [...current, lead],
  );
}

export function convertLead(id: string): void {
  const current = getLeadsSnapshot();
  const now = new Date().toISOString();
  write(
    current.map((lead) =>
      lead.id === id ? { ...lead, status: "converted", updatedAt: now } : lead,
    ),
  );
}

export function deleteLead(id: string): void {
  write(getLeadsSnapshot().filter((lead) => lead.id !== id));
}
