import { convertLeadRecord, saveLeadRecord, softDeleteLeadRecord } from "@/lib/data/leads-repository";
import { parseLeadInput } from "@/lib/api/validation";
import { jsonData, jsonError, readJson } from "@/lib/api/route-utils";

type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) { try { const { id } = await context.params; const lead = parseLeadInput(await readJson(request)); return jsonData(await saveLeadRecord({ ...lead, id })); } catch (error) { return jsonError(error); } }
export async function PATCH(request: Request, context: Context) { try { const { id } = await context.params; const body = await readJson(request); if (!body || typeof body !== "object" || !("status" in body) || body.status !== "converted") throw new Error("التعديل الجزئي المدعوم هو التحويل فقط."); return jsonData(await convertLeadRecord(id)); } catch (error) { return jsonError(error); } }
export async function DELETE(_request: Request, context: Context) { try { const { id } = await context.params; await softDeleteLeadRecord(id); return jsonData({ deleted: true }); } catch (error) { return jsonError(error); } }
