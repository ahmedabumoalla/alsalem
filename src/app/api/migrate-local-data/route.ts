import { getLocalMigrationStatus, migrateLocalData, type LocalMigrationPayload } from "@/lib/data/local-migration";
import { jsonData, jsonError, readJson } from "@/lib/api/route-utils";
import { requireAuthorizedApiUser } from "@/lib/auth/require-authorized-user";

export const dynamic = "force-dynamic";

function parsePayload(value: unknown): LocalMigrationPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("بيانات الترحيل غير صالحة.");
  const record = value as Record<string, unknown>;
  const array = (key: string) => Array.isArray(record[key]) ? record[key] as unknown[] : [];
  if (typeof record.importId !== "string" || !record.importId.trim()) throw new Error("معرف عملية الترحيل مطلوب.");
  return { importId: record.importId, invoices: array("invoices"), pressureCosts: array("pressureCosts"), receipts: array("receipts"), leads: array("leads") };
}

export async function GET() { const denied = await requireAuthorizedApiUser(); if (denied) return denied; try { return jsonData(await getLocalMigrationStatus()); } catch (error) { return jsonError(error); } }
export async function POST(request: Request) { const denied = await requireAuthorizedApiUser(); if (denied) return denied; try { return jsonData(await migrateLocalData(parsePayload(await readJson(request)))); } catch (error) { return jsonError(error); } }
