// Contrato de tipos del motor de viabilidad (spec docs/specs/viability-engine.md, aprobada 2026-08-30).

export interface UnitType {
  type: string;
  count: number;
  avgM2: number;
  priceFromEur: number;
}

export interface ViabilityFinancials {
  landCostEur: number;
  constructionBudgetEur: number;
  totalBudgetEur: number;
  revenueContractedEur: number;
}

export interface ViabilityInput {
  id: string;
  unitsTotal: number;
  unitTypes: UnitType[];
  financials: ViabilityFinancials;
  startDate?: string;
  fechaCorte?: string;
  unitsSold?: number;
}

export interface Umbrales {
  margenBrutoMinPct?: number;
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
