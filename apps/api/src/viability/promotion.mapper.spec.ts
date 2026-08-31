import { promocionDocToViabilityInput } from './promotion.mapper';
import type { Promotion } from './promotion.schema';

// Documento equivalente al fixture real de La Marina (promociones.yaml), tal como
// lo devuelve Mongoose tras el seed.
const laMarinaDoc = {
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
  risks: [{ name: 'Retraso suministro carpintería exterior' }],
} as Promotion;

describe('promocionDocToViabilityInput', () => {
  it('mapea La Marina al contrato del motor con todos los campos obligatorios', () => {
    const input = promocionDocToViabilityInput(laMarinaDoc);
    expect(input.id).toBe('promo-la-marina-2');
    expect(input.unitsTotal).toBe(96);
    expect(input.unitTypes).toEqual(laMarinaDoc.unitTypes);
    expect(input.financials).toEqual({
      landCostEur: 4200000,
      constructionBudgetEur: 14800000,
      totalBudgetEur: 21500000,
      revenueContractedEur: 19200000,
    });
    expect(input.startDate).toBe('2023-04-15');
    expect(input.unitsSold).toBe(82);
  });

  it('nunca copia projectedMargin del fixture al input (el motor siempre calcula)', () => {
    const input = promocionDocToViabilityInput(laMarinaDoc);
    expect(input.financials).not.toHaveProperty('projectedMarginEur');
    expect(input.financials).not.toHaveProperty('projectedMarginPct');
  });

  it('omite los campos opcionales ausentes (startDate y unitsSold) sin violar el contrato', () => {
    const docSinOpcionales = { ...laMarinaDoc };
    delete (docSinOpcionales as Partial<Promotion>).startDate;
    delete (docSinOpcionales as Partial<Promotion>).unitsSold;
    const input = promocionDocToViabilityInput(docSinOpcionales as Promotion);
    expect(input.startDate).toBeUndefined();
    expect(input.unitsSold).toBeUndefined();
    expect(Object.keys(input)).not.toContain('startDate');
    expect(Object.keys(input)).not.toContain('unitsSold');
  });
});
