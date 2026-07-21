import { listLeads, saveLeadRecord } from "@/lib/data/leads-repository";
import { parseLeadInput } from "@/lib/api/validation";
import { jsonData, jsonError, readJson } from "@/lib/api/route-utils";

export const dynamic = "force-dynamic";
export async function GET() { try { return jsonData(await listLeads()); } catch (error) { return jsonError(error); } }
export async function POST(request: Request) { try { return jsonData(await saveLeadRecord(parseLeadInput(await readJson(request))), 201); } catch (error) { return jsonError(error); } }
