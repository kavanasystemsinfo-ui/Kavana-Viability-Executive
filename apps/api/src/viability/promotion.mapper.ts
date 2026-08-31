import type { ViabilityInput } from '@kavana-viability-executive/viability-engine';
import type { Promotion } from './promotion.schema';

/**
 * Adaptador puro entre el documento de promoción (MongoDB) y el contrato del
 * motor de viabilidad. El motor permanece agnóstico del origen de los datos.
 *
 * Nota de diseño (ADR-003): projectedMarginEur/projectedMarginPct del fixture
 * NUNCA se propagan al input; el motor siempre calcula el margen.
 */
export function promocionDocToViabilityInput(promocion: Promotion): ViabilityInput {
  const input: ViabilityInput = {
    id: promocion.promotionId,
    unitsTotal: promocion.unitsTotal,
    unitTypes: promocion.unitTypes.map((u) => ({
      type: u.type,
      count: u.count,
      avgM2: u.avgM2,
      priceFromEur: u.priceFromEur,
    })),
    financials: {
      landCostEur: promocion.financials.landCostEur,
      constructionBudgetEur: promocion.financials.constructionBudgetEur,
      totalBudgetEur: promocion.financials.totalBudgetEur,
      revenueContractedEur: promocion.financials.revenueContractedEur,
    },
    ...(promocion.startDate !== undefined && promocion.startDate !== null
      ? { startDate: promocion.startDate }
      : {}),
    ...(promocion.unitsSold !== undefined && promocion.unitsSold !== null
      ? { unitsSold: promocion.unitsSold }
      : {}),
  };
  return input;
}
