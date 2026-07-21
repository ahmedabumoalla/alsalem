"use client";

import type { Lead } from "@/lib/types/lead";
import { useRemoteCollection } from "@/lib/hooks/use-remote-collection";

export function useLeads() {
  return useRemoteCollection<Lead>("/api/leads", "leads");
}
