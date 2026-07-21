export type LeadStatus =
  | "new"
  | "contacted"
  | "interested"
  | "converted"
  | "not_interested";

export type LeadSource =
  | "call"
  | "whatsapp"
  | "visit"
  | "referral"
  | "ad"
  | "exhibition"
  | "website"
  | "other";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  source: LeadSource;
  customSource?: string;
  notes?: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export const LEADS_STORAGE_KEY = "foam_sales_leads";
