"use client";
import type { FoamPressureCost } from "@/lib/types/pressure-cost";
import { useRemoteCollection } from "@/lib/hooks/use-remote-collection";
export function usePressureCosts() { return useRemoteCollection<FoamPressureCost>("/api/pressure-costs", "pressure-costs"); }
