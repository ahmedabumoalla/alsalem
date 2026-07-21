import type { Lead, LeadSource, LeadStatus } from "@/lib/types/lead";
import { isValidOptionalPhone, normalizePhone } from "@/lib/utils/contact";

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  call: "اتصال",
  whatsapp: "واتساب",
  visit: "زيارة",
  referral: "توصية",
  ad: "إعلان",
  exhibition: "معرض",
  website: "موقع إلكتروني",
  other: "أخرى",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "جديد",
  contacted: "تم التواصل",
  interested: "مهتم",
  converted: "تم التحويل",
  not_interested: "غير مهتم",
};

export interface LeadFilters {
  query: string;
  source: "" | LeadSource;
  status: "" | LeadStatus;
}

export const DEFAULT_LEAD_FILTERS: LeadFilters = {
  query: "",
  source: "",
  status: "",
};

export function validateLead(lead: Lead, existing: Lead[]): string | undefined {
  if (!lead.name.trim()) return "اسم العميل المحتمل مطلوب";
  const phone = normalizePhone(lead.phone);
  if (!phone) return "رقم الجوال مطلوب";
  if (!isValidOptionalPhone(phone)) return "أدخل رقم جوال صحيحًا من 7 إلى 15 رقمًا";
  if (lead.source === "other" && !lead.customSource?.trim()) {
    return "اكتب المصدر المخصص";
  }
  if (
    existing.some(
      (item) => item.id !== lead.id && normalizePhone(item.phone) === phone,
    )
  ) {
    return "رقم الجوال مسجل لعميل محتمل آخر";
  }
}

export function normalizeLead(lead: Lead): Lead {
  return {
    ...lead,
    name: lead.name.trim().replace(/\s+/g, " "),
    phone: normalizePhone(lead.phone),
    customSource:
      lead.source === "other" ? lead.customSource?.trim() || undefined : undefined,
    notes: lead.notes?.trim() || undefined,
  };
}

export function getLeadSourceLabel(lead: Lead): string {
  return lead.source === "other" && lead.customSource
    ? lead.customSource
    : LEAD_SOURCE_LABELS[lead.source];
}

export function filterLeads(leads: Lead[], filters: LeadFilters): Lead[] {
  const query = filters.query.trim().toLocaleLowerCase("ar");
  const phoneQuery = normalizePhone(filters.query);
  return [...leads]
    .filter((lead) => {
      const matchesQuery =
        !query ||
        lead.name.toLocaleLowerCase("ar").includes(query) ||
        (phoneQuery && normalizePhone(lead.phone).includes(phoneQuery));
      return (
        matchesQuery &&
        (!filters.source || lead.source === filters.source) &&
        (!filters.status || lead.status === filters.status)
      );
    })
    .sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        right.updatedAt.localeCompare(left.updatedAt),
    );
}
