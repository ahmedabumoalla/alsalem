import "server-only";

import type { CustomerRow } from "@/lib/supabase/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toDataAccessError } from "@/lib/data/errors";

export interface CustomerRecord {
  id: string;
  name: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

function mapCustomer(row: CustomerRow): CustomerRecord {
  return { id: row.id, name: row.name, phone: row.phone ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function listCustomers(): Promise<CustomerRecord[]> {
  const { data, error } = await getSupabaseServerClient().from("customers").select("*").order("normalized_name");
  if (error) throw toDataAccessError(error, "تعذر تحميل العملاء.");
  return data.map(mapCustomer);
}
