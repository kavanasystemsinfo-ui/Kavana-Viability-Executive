export interface Promotion {
  id: string;
  name: string;
  status: string;
  progress_pct: number;
  startDate: string;
  estimatedDelivery: string;
  unitsTotal: number;
  unitsSold: number | null;
  unitsAvailable: number;
  location: {
    city: string | null;
    province: string | null;
    address: string | null;
    coordinates: [number, number] | null;
  };
  // Campos extraídos del fixture (no rompen compatibilidad hacia atrás)
  start_date?: string;
  estimated_delivery?: string;
  units_total?: number;
  units_sold?: number | null;
  units_available?: number;
  unit_types?: PromotionUnitType[];
  financials?: PromotionFinancials;
  financing?: PromotionFinancing;
  jefe_proyecto?: string;
  critical_path?: (string | { text: string; when: string; status: string })[];
  risks?: string[];
}

export interface PromotionUnitType {
  type: string;
  count: number;
  avg_m2: number;
  price_from_eur: number;
}

export interface PromotionFinancials {
  land_cost_eur: number;
  construction_budget_eur: number;
  construction_spent_eur: number;
  total_budget_eur: number;
  revenue_contracted_eur: number;
  projected_margin_eur: number;
  projected_margin_pct: number;
  avg_price_m2_eur?: number;
}

export interface PromotionFinancing {
  bank: string;
  loan_amount_eur: number;
  drawn_eur: number;
  interest_rate: string;
  maturity: string;
}

export interface ViabilityResult {
  revenueExpectedEur: number;
  marginBrutoEur: number;
  marginBrutoPct: number;
  preVentasPct: number;
  costPerUnitEur: number;
  costPerM2Eur: number;
  avgPriceM2Eur: number;
  unitsConsistent: boolean;
  speedVentaUdsMes: number | null;
  viable: boolean | null;
  umbralMarginAplicadoPct: number | null;
  warnings: string[];
}

export interface ViabilityKpis {
  promotionId: string;
  companyId: string;
  revenueExpectedEur: number;
  marginBrutoEur: number;
  marginBrutoPct: number;
  preVentasPct: number;
  costPerUnitEur: number;
  costPerM2Eur: number;
  avgPriceM2Eur: number;
  unitsConsistent: boolean;
  speedVentaUdsMes: number | null;
  viable: boolean | null;
}
