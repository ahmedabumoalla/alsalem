import { convertLeadRecord, saveLeadRecord, softDeleteLeadRecord } from "@/lib/data/leads-repository";
import { parseLeadInput } from "@/lib/api/validation";
import { jsonData, jsonError, readJson } from "@/lib/api/route-utils";
import { requireAuthorizedApiUser } from "@/lib/auth/require-authorized-user";

type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  const denied = await requireAuthorizedApiUser(); if (denied) return denied;
  try { const { id } = await context.params; return jsonData(await saveLeadRecord({ ...parseLeadInput(await readJson(request)), id })); } catch (error) { return jsonError(error); }
}
export async function PATCH(request: Request, context: Context) {
  const denied = await requireAuthorizedApiUser(); if (denied) return denied;
  try { const { id } = await context.params; const body = await readJson(request); if (!body || typeof body !== "object" || !("status" in body) || body.status !== "converted") throw new Error("التعديل الجزئي المدعوم هو التحويل فقط."); return jsonData(await convertLeadRecord(id)); } catch (error) { return jsonError(error); }
}
export async function DELETE(_request: Request, context: Context) {
  const denied = await requireAuthorizedApiUser(); if (denied) return denied;
  try { const { id } = await context.params; await softDeleteLeadRecord(id); return jsonData({ deleted: true }); } catch (error) { return jsonError(error); }
}
