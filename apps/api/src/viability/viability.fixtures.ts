import type { Promotion } from './promotion.schema';

/**
 * Fixture de test: documento de promoción equivalente al real de La Marina
 * (fixtures/companies/kavana-viability-executive/docs/promociones.yaml) tal
 * como lo devuelve Mongoose. Los cálculos del motor sobre este fixture son
 * verificables a mano: 22.320.000 € ingresos, 820.000 € margen (3,7%).
 */
export const laMarinaDoc = {
  companyId: 'kavana_viability_executive',
  promotionId: 'promo-la-marina-2',
  name: 'La Marina - Fase 2',
  location: {
    city: 'Castellón de la Plana',
    province: 'Castellón',
    coordinates: [-0.0341, 39.9862],
    address: "C/ Marina d'Or, s/n",
  },
  status: 'Ejecución',
  progressPct: 65,
  startDate: '2023-04-15',
  estimatedDelivery: '2025-10-31',
  unitsTotal: 96,
  unitsSold: 82,
  unitsAvailable: 14,
  unitTypes: [
    { type: '2 dorm / 1 baño', count: 24, avgM2: 72, priceFromEur: 185000 },
    { type: '3 dorm / 2 baños', count: 56, avgM2: 92, priceFromEur: 235000 },
    { type: '4 dorm / 2 baños', count: 16, avgM2: 115, priceFromEur: 295000 },
  ],
  financials: {
    landCostEur: 4200000,
    constructionBudgetEur: 14800000,
    constructionSpentEur: 9620000,
    totalBudgetEur: 21500000,
    revenueContractedEur: 19200000,
    projectedMarginEur: 3200000,
    projectedMarginPct: 14.9,
  },
  financing: {
    bank: 'CaixaBank',
    loanAmountEur: 13500000,
    drawnEur: 8800000,
    interestRate: 'Euribor + 1.85%',
    maturity: '2026-12-31',
  },
  jefeProyecto: 'jp-la-marina',
  criticalPath: ['Estructura finalizada (OK - Ene 2024)'],
  risks: ['Retraso suministro carpintería exterior (proveedor único)'],
} as Promotion;
