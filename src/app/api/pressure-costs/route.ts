import { deletePressureCostRecord, listPressureCosts, savePressureCostRecord } from "@/lib/data/pressure-costs-repository";
import { parsePressureCostInput } from "@/lib/api/validation";
import { jsonData, jsonError, readJson } from "@/lib/api/route-utils";

export const dynamic = "force-dynamic";
export async function GET() { try { return jsonData(await listPressureCosts()); } catch (error) { return jsonError(error); } }
export async function POST(request: Request) { try { return jsonData(await savePressureCostRecord(parsePressureCostInput(await readJson(request))), 201); } catch (error) { return jsonError(error); } }
export async function DELETE(request: Request) { try { const id = new URL(request.url).searchParams.get("id"); if (!id) throw new Error("معرف تكلفة الضغط مطلوب."); await deletePressureCostRecord(id); return jsonData({ deleted: true }); } catch (error) { return jsonError(error); } }
