import { createReceiptRecord, listReceipts } from "@/lib/data/receipts-repository";
import { parseReceiptInput } from "@/lib/api/validation";
import { jsonData, jsonError, readJson } from "@/lib/api/route-utils";
import { requireAuthorizedApiUser } from "@/lib/auth/require-authorized-user";

export const dynamic = "force-dynamic";
export async function GET() { const denied = await requireAuthorizedApiUser(); if (denied) return denied; try { return jsonData(await listReceipts()); } catch (error) { return jsonError(error); } }
export async function POST(request: Request) { const denied = await requireAuthorizedApiUser(); if (denied) return denied; try { return jsonData(await createReceiptRecord(parseReceiptInput(await readJson(request))), 201); } catch (error) { return jsonError(error); } }
