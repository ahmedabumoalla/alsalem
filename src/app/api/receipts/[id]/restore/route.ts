import { restoreReceiptRecord } from "@/lib/data/receipts-repository";
import { jsonData, jsonError } from "@/lib/api/route-utils";
import { requireAuthorizedApiUser } from "@/lib/auth/require-authorized-user";

type Context = { params: Promise<{ id: string }> };
export async function POST(_request: Request, context: Context) { const denied = await requireAuthorizedApiUser(); if (denied) return denied; try { const { id } = await context.params; await restoreReceiptRecord(id); return jsonData({ restored: true }); } catch (error) { return jsonError(error); } }
