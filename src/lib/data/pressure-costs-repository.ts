import "server-only";

import type { FoamPressureCost } from "@/lib/types/pressure-cost";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toDataAccessError } from "@/lib/data/errors";
import { mapPressureCost } from "@/lib/data/mappers";

export async function listPressureCosts(): Promise<FoamPressureCost[]> {
  const { data, error } = await getSupabaseServerClient().from("pressure_costs").select("*").order("pressure");
  if (error) throw toDataAccessError(error, "تعذر تحميل مركز التكلفة.");
  return data.map(mapPressureCost);
}

export async function savePressureCostRecord(item: FoamPressureCost): Promise<FoamPressureCost> {
  const { data, error } = await getSupabaseServerClient().from("pressure_costs").upsert({
    id: item.id,
    pressure: item.pressure,
    standard_block_cost: item.standardBlockCost,
    standard_length_cm: 100,
    standard_width_cm: 120,
    standard_height_cm: 400,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }).select().single();
  if (error) throw toDataAccessError(error, "تعذر حفظ تكلفة الضغط.");
  return mapPressureCost(data);
}

export async function deletePressureCostRecord(id: string): Promise<void> {
  const { error } = await getSupabaseServerClient().from("pressure_costs").delete().eq("id", id);
  if (error) throw toDataAccessError(error, "تعذر حذف تكلفة الضغط. قد تكون مستخدمة في بيانات أخرى.");
}
