import { softDeleteReceiptRecord, updateReceiptRecord } from "@/lib/data/receipts-repository";
import { parseReceiptInput } from "@/lib/api/validation";
import { jsonData, jsonError, readJson } from "@/lib/api/route-utils";
import { requireAuthorizedApiUser } from "@/lib/auth/require-authorized-user";

type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) { const denied = await requireAuthorizedApiUser(); if (denied) return denied; try { const { id } = await context.params; return jsonData(await updateReceiptRecord(id, parseReceiptInput(await readJson(request)))); } catch (error) { return jsonError(error); } }
export async function DELETE(_request: Request, context: Context) { const denied = await requireAuthorizedApiUser(); if (denied) return denied; try { const { id } = await context.params; await softDeleteReceiptRecord(id); return jsonData({ deleted: true }); } catch (error) { return jsonError(error); } }
