export interface FoamPressureCost {
  id: string;
  pressure: number;
  standardBlockCost: number;
  standardLengthCm: number;
  standardWidthCm: number;
  standardHeightCm: number;
  createdAt: string;
  updatedAt: string;
}

export const PRESSURE_COSTS_STORAGE_KEY = "foam_sales_pressure_costs";
