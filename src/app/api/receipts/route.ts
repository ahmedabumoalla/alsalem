import { createReceiptRecord, listReceipts } from "@/lib/data/receipts-repository";
import { parseReceiptInput } from "@/lib/api/validation";
import { jsonData, jsonError, readJson } from "@/lib/api/route-utils";

export const dynamic = "force-dynamic";
export async function GET() { try { return jsonData(await listReceipts()); } catch (error) { return jsonError(error); } }
export async function POST(request: Request) { try { return jsonData(await createReceiptRecord(parseReceiptInput(await readJson(request))), 201); } catch (error) { return jsonError(error); } }
