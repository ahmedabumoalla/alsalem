import type { FoamPressureCost } from "@/lib/types/pressure-cost";
import { PRESSURE_COSTS_STORAGE_KEY } from "@/lib/types/pressure-cost";
import { notifyStorageKey, subscribeStorageKey } from "@/lib/storage/storage-events";

const EMPTY: FoamPressureCost[] = [];
let cachedRaw: string | null | undefined;
let cached: FoamPressureCost[] = EMPTY;

export function getPressureCostsSnapshot(): FoamPressureCost[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = localStorage.getItem(PRESSURE_COSTS_STORAGE_KEY);
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cached = Array.isArray(parsed) ? parsed.filter(isPressureCost) : EMPTY;
  } catch { cached = EMPTY; }
  return cached;
}

function isPressureCost(value: unknown): value is FoamPressureCost {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<FoamPressureCost>;
  return typeof item.id === "string" && Number.isFinite(item.pressure) && Number.isFinite(item.standardBlockCost);
}

export function getServerPressureCostsSnapshot(): FoamPressureCost[] { return EMPTY; }
export function subscribePressureCosts(listener: () => void): () => void { return subscribeStorageKey(PRESSURE_COSTS_STORAGE_KEY, listener); }

function write(items: FoamPressureCost[]): void {
  localStorage.setItem(PRESSURE_COSTS_STORAGE_KEY, JSON.stringify(items));
  cachedRaw = undefined;
  notifyStorageKey(PRESSURE_COSTS_STORAGE_KEY);
}

export function savePressureCost(item: FoamPressureCost): void {
  const current = getPressureCostsSnapshot();
  const duplicate = current.some((entry) => entry.pressure === item.pressure && entry.id !== item.id);
  if (duplicate) throw new Error("هذا الضغط مسجل مسبقًا");
  if (!Number.isFinite(item.pressure) || item.pressure <= 0) throw new Error("الضغط يجب أن يكون رقمًا منتهيًا وأكبر من صفر");
  if (!Number.isFinite(item.standardBlockCost) || item.standardBlockCost < 0) throw new Error("التكلفة يجب أن تكون رقمًا منتهيًا وصفرًا أو أكثر");
  const exists = current.some((entry) => entry.id === item.id);
  write(exists ? current.map((entry) => entry.id === item.id ? item : entry) : [...current, item]);
}

export function deletePressureCost(id: string): void { write(getPressureCostsSnapshot().filter((entry) => entry.id !== id)); }
