import { listCustomers } from "@/lib/data/customers-repository";
import { jsonData, jsonError } from "@/lib/api/route-utils";
import { requireAuthorizedApiUser } from "@/lib/auth/require-authorized-user";

export const dynamic = "force-dynamic";
export async function GET() { const denied = await requireAuthorizedApiUser(); if (denied) return denied; try { return jsonData(await listCustomers()); } catch (error) { return jsonError(error); } }
