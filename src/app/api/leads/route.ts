import { listLeads, saveLeadRecord } from "@/lib/data/leads-repository";
import { parseLeadInput } from "@/lib/api/validation";
import { jsonData, jsonError, readJson } from "@/lib/api/route-utils";
import { requireAuthorizedApiUser } from "@/lib/auth/require-authorized-user";

export const dynamic = "force-dynamic";
export async function GET() { const denied = await requireAuthorizedApiUser(); if (denied) return denied; try { return jsonData(await listLeads()); } catch (error) { return jsonError(error); } }
export async function POST(request: Request) { const denied = await requireAuthorizedApiUser(); if (denied) return denied; try { return jsonData(await saveLeadRecord(parseLeadInput(await readJson(request))), 201); } catch (error) { return jsonError(error); } }
