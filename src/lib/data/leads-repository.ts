import "server-only";

import type { Lead } from "@/lib/types/lead";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toDataAccessError } from "@/lib/data/errors";
import { mapLead } from "@/lib/data/mappers";
import { normalizePhone } from "@/lib/utils/contact";

export async function listLeads(includeDeleted = false): Promise<Lead[]> {
  const client = getSupabaseServerClient();
  let query = client.from("leads").select("*").order("created_at", { ascending: false });
  if (!includeDeleted) query = query.is("deleted_at", null);
  const { data, error } = await query;
  if (error) throw toDataAccessError(error, "تعذر تحميل العملاء المحتملين.");
  return data.map(mapLead);
}

export async function saveLeadRecord(lead: Lead): Promise<Lead> {
  const { data, error } = await getSupabaseServerClient().from("leads").upsert({
    id: lead.id,
    name: lead.name,
    phone: normalizePhone(lead.phone),
    normalized_phone: normalizePhone(lead.phone),
    source: lead.source,
    custom_source: lead.source === "other" ? lead.customSource ?? null : null,
    notes: lead.notes ?? null,
    status: lead.status,
    created_at: lead.createdAt,
    updated_at: lead.updatedAt,
    deleted_at: null,
  }).select().single();
  if (error) throw toDataAccessError(error, "تعذر حفظ العميل المحتمل.");
  return mapLead(data);
}

export async function softDeleteLeadRecord(id: string): Promise<void> {
  const { error } = await getSupabaseServerClient().from("leads").update({ deleted_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null);
  if (error) throw toDataAccessError(error, "تعذر حذف العميل المحتمل.");
}

export async function convertLeadRecord(id: string): Promise<Lead> {
  const { data, error } = await getSupabaseServerClient().from("leads").update({ status: "converted", updated_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null).select().single();
  if (error) throw toDataAccessError(error, "تعذر تحويل حالة العميل المحتمل.");
  return mapLead(data);
}

export async function findLeadByPhone(phone: string): Promise<Lead | undefined> {
  const { data, error } = await getSupabaseServerClient().from("leads").select("*").eq("normalized_phone", normalizePhone(phone)).is("deleted_at", null).maybeSingle();
  if (error) throw toDataAccessError(error, "تعذر التحقق من رقم العميل المحتمل.");
  return data ? mapLead(data) : undefined;
}
