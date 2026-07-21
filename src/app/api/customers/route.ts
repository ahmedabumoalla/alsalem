import { listCustomers } from "@/lib/data/customers-repository";
import { jsonData, jsonError } from "@/lib/api/route-utils";

export const dynamic = "force-dynamic";
export async function GET() { try { return jsonData(await listCustomers()); } catch (error) { return jsonError(error); } }
