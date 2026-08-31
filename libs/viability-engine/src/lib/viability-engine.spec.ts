import {
  calcularConsistencia,
  calcularCostePorM2,
  calcularCostePorUnidad,
  calcularIngresosEsperados,
  calcularMargen,
  calcularPreVentas,
  calcularPrecioMedioM2,
  calcularVelocidadVenta,
  calcularViabilidad,
} from './viability-engine';
import type { UnitType, ViabilityInput } from './types';

// Construye una copia del fixture sin un campo opcional (para casos límite sin violar exactOptionalPropertyTypes).
function sinCampo(input: ViabilityInput, campo: 'startDate' | 'unitsSold'): ViabilityInput {
  const copia = { ...input };
  delete copia[campo];
  return copia;
}

// Fixture real de la promoción demo La Marina (fixtures/companies/kavana-viability-executive/docs/promociones.yaml).
// Verificable a mano: 24x185000 + 56x235000 + 16x295000 = 22.320.000 €.
export const laMarina: ViabilityInput = {
  id: 'promo-la-marina-2',
  unitsTotal: 96,
  unitTypes: [
    { type: '2 dorm / 1 baño', count: 24, avgM2: 72, priceFromEur: 185000 },
    { type: '3 dorm / 2 baños', count: 56, avgM2: 92, priceFromEur: 235000 },
    { type: '4 dorm / 2 baños', count: 16, avgM2: 115, priceFromEur: 295000 },
  ],
  financials: {
    landCostEur: 4200000,
    constructionBudgetEur: 14800000,
    totalBudgetEur: 21500000,
    revenueContractedEur: 19200000,
  },
  startDate: '2023-04-15',
  fechaCorte: '2026-08-30',
  unitsSold: 82,
};

describe('Grupo 1: ingresos esperados', () => {
  it('suma count x priceFromEur con 3 tipos de unidad (La Marina = 22.320.000)', () => {
    expect(calcularIngresosEsperados(laMarina.unitTypes)).toBe(22_320_000);
  });

  it('suma count x priceFromEur con 1 tipo de unidad', () => {
    const unitTypes: UnitType[] = [{ type: 'estudio', count: 2, avgM2: 80, priceFromEur: 100_000 }];
    expect(calcularIngresosEsperados(unitTypes)).toBe(200_000);
  });

  it('devuelve 0 sin tipos de unidad', () => {
    expect(calcularIngresosEsperados([])).toBe(0);
  });
});

describe('Grupo 2: margen bruto (€ y %)', () => {
  it('calcula margen para La Marina: 820.000 € y 3,7%', () => {
    const ingresos = calcularIngresosEsperados(laMarina.unitTypes);
    const { marginBrutoEur, marginBrutoPct } = calcularMargen(
      ingresos,
      laMarina.financials.totalBudgetEur,
    );
    expect(marginBrutoEur).toBe(820_000);
    expect(marginBrutoPct).toBe(3.7);
  });

  it('división por cero en ingresos: margen € finito y % NaN explícito', () => {
    const { marginBrutoEur, marginBrutoPct } = calcularMargen(0, 500_000);
    expect(marginBrutoEur).toBe(-500_000);
    expect(Number.isNaN(marginBrutoPct)).toBe(true);
  });

  it('redondea el porcentaje a 1 decimal', () => {
    const { marginBrutoPct } = calcularMargen(100_000, 0);
    expect(marginBrutoPct).toBe(100);
  });
});

describe('Grupo 3: pre-ventas % y velocidad de venta', () => {
  it('pre-ventas La Marina: 19.200.000 / 22.320.000 = 86,0%', () => {
    expect(calcularPreVentas(laMarina.financials.revenueContractedEur, 22_320_000)).toBe(86.0);
  });

  it('pre-ventas con ingresos 0 devuelve NaN explícito (división por cero)', () => {
    expect(Number.isNaN(calcularPreVentas(0, 0))).toBe(true);
  });

  it('pre-ventas sin ingresos contratados devuelve 0', () => {
    expect(calcularPreVentas(0, 22_320_000)).toBe(0);
  });

  it('velocidad La Marina con fechaCorte fija 2026-08-30: 82 uds / ~40,5 meses = 2,0 uds/mes', () => {
    // 1233 días entre 2023-04-15 y 2026-08-30; meses = días / 30,44; 82/40,5059 = 2,0244 → 2,0
    expect(calcularVelocidadVenta(laMarina)).toBe(2.0);
  });

  it('velocidad null si falta startDate o unitsSold', () => {
    expect(calcularVelocidadVenta(sinCampo(laMarina, 'startDate'))).toBeNull();
    expect(calcularVelocidadVenta(sinCampo(laMarina, 'unitsSold'))).toBeNull();
  });
});

describe('Grupo 4: consistencia de unidades', () => {
  it('La Marina consistente: unitsTotal 96 = Σ counts 96 → true y sin warnings', () => {
    const { unitsConsistent, warnings } = calcularConsistencia(laMarina);
    expect(unitsConsistent).toBe(true);
    expect(warnings).toEqual([]);
  });

  it('inconsistencia unitsTotal vs Σ counts → false + warning, nunca excepción', () => {
    const input: ViabilityInput = { ...laMarina, unitsTotal: 90 };
    const { unitsConsistent, warnings } = calcularConsistencia(input);
    expect(unitsConsistent).toBe(false);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('90');
  });

  it('unitsSold mayor que unitsTotal → warning', () => {
    const input: ViabilityInput = { ...laMarina, unitsSold: 100 };
    const { unitsConsistent, warnings } = calcularConsistencia(input);
    expect(unitsConsistent).toBe(true);
    expect(warnings.some((w) => w.includes('unitsSold'))).toBe(true);
  });
});

describe('Grupo 5: coste por unidad, coste por m2 y precio medio m2', () => {
  it('La Marina: coste/unidad 223.958 € (21.500.000 / 96)', () => {
    expect(calcularCostePorUnidad(laMarina.financials.totalBudgetEur, laMarina.unitsTotal)).toBe(
      223_958,
    );
  });

  it('La Marina: coste/m2 2.466 € (21.500.000 / 8.720 m2)', () => {
    expect(calcularCostePorM2(laMarina.financials.totalBudgetEur, laMarina.unitTypes)).toBe(2_466);
  });

  it('La Marina: precio medio m2 2.560 € (22.320.000 / 8.720 m2)', () => {
    expect(calcularPrecioMedioM2(22_320_000, laMarina.unitTypes)).toBe(2_560);
  });

  it('división por cero: unidades 0 o m2 0 → NaN explícito', () => {
    expect(Number.isNaN(calcularCostePorUnidad(21_500_000, 0))).toBe(true);
    expect(Number.isNaN(calcularCostePorM2(21_500_000, []))).toBe(true);
    expect(Number.isNaN(calcularPrecioMedioM2(22_320_000, []))).toBe(true);
  });

  it('caso sintético: 2 uds de 80 m2 a 100.000 € → coste/ud 50.000 y precio medio m2 1.250', () => {
    const unitTypes: UnitType[] = [{ type: 'estudio', count: 2, avgM2: 80, priceFromEur: 100_000 }];
    expect(calcularCostePorUnidad(100_000, 2)).toBe(50_000);
    expect(calcularPrecioMedioM2(200_000, unitTypes)).toBe(1_250);
  });
});

describe('Grupo 6: viabilidad contra umbral y resultado completo', () => {
  it('La Marina: margen 3,7% < umbral 18% por defecto → no viable, umbral documentado', () => {
    const r = calcularViabilidad(laMarina);
    expect(r.viable).toBe(false);
    expect(r.umbralMarginAplicadoPct).toBe(18);
    expect(r.warnings).toEqual([]);
  });

  it('umbral configurable: margen 3,7% >= 3% → viable y umbral 3 aplicado', () => {
    expect(calcularViabilidad(laMarina, { margenBrutoMinPct: 3 }).viable).toBe(true);
    expect(calcularViabilidad(laMarina, { margenBrutoMinPct: 3 }).umbralMarginAplicadoPct).toBe(3);
  });

  it('sin umbral aplicable (ingresos 0 → margen NaN): viable null y umbral null', () => {
    const input: ViabilityInput = {
      id: 'sin-revenue',
      unitsTotal: 10,
      unitTypes: [{ type: 'x', count: 10, avgM2: 70, priceFromEur: 0 }],
      financials: {
        landCostEur: 0,
        constructionBudgetEur: 0,
        totalBudgetEur: 1_000_000,
        revenueContractedEur: 0,
      },
    };
    const r = calcularViabilidad(input);
    expect(r.viable).toBeNull();
    expect(r.umbralMarginAplicadoPct).toBeNull();
    expect(Number.isNaN(r.marginBrutoPct)).toBe(true);
  });

  it('resultado completo de La Marina, verificable a mano', () => {
    const r = calcularViabilidad(laMarina);
    expect(r.revenueExpectedEur).toBe(22_320_000);
    expect(r.marginBrutoEur).toBe(820_000);
    expect(r.marginBrutoPct).toBe(3.7);
    expect(r.preVentasPct).toBe(86.0);
    expect(r.costPerUnitEur).toBe(223_958);
    expect(r.costPerM2Eur).toBe(2_466);
    expect(r.avgPriceM2Eur).toBe(2_560);
    expect(r.unitsConsistent).toBe(true);
    expect(r.speedVentaUdsMes).toBe(2.0);
    expect(r.viable).toBe(false);
    expect(r.umbralMarginAplicadoPct).toBe(18);
  });

  it('dato inconsistente llega a warnings sin lanzar excepción', () => {
    const r = calcularViabilidad({ ...laMarina, unitsTotal: 90 });
    expect(r.unitsConsistent).toBe(false);
    expect(r.warnings.some((w) => w.includes('unitsTotal'))).toBe(true);
  });
});
