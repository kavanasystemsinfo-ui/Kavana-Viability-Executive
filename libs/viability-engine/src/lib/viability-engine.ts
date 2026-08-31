import type { Umbrales, UnitType, ViabilityInput, ViabilityResult } from './types';

/**
 * Ingresos esperados de la promoción: sumatorio de count x priceFromEur por tipo de unidad.
 * Regla KAVANA: redondeo a euros enteros.
 */
export function calcularIngresosEsperados(unitTypes: UnitType[]): number {
  const total = unitTypes.reduce((acc, u) => acc + u.count * u.priceFromEur, 0);
  return Math.round(total);
}

export interface MargenResult {
  marginBrutoEur: number;
  marginBrutoPct: number;
}

/**
 * Margen bruto proyectado: revenue - presupuesto total (euros enteros) y % sobre revenue (1 decimal).
 * División por cero en revenue: porcentaje NaN explícito, nunca excepción ni fallback silencioso.
 */
export function calcularMargen(revenueExpectedEur: number, totalBudgetEur: number): MargenResult {
  const marginBrutoEur = Math.round(revenueExpectedEur - totalBudgetEur);
  const marginBrutoPct =
    revenueExpectedEur === 0
      ? NaN
      : Math.round(((revenueExpectedEur - totalBudgetEur) / revenueExpectedEur) * 1000) / 10;
  return { marginBrutoEur, marginBrutoPct };
}

/**
 * Pre-ventas: revenue contratado / revenue esperado, en porcentaje con 1 decimal.
 * División por cero (ingresos 0): NaN explícito.
 */
export function calcularPreVentas(
  revenueContractedEur: number,
  revenueExpectedEur: number,
): number {
  if (revenueExpectedEur === 0) {
    return NaN;
  }
  return Math.round((revenueContractedEur / revenueExpectedEur) * 1000) / 10;
}

// Días medios por mes (365,25 / 12) para traducir días transcurridos a meses comerciales.
const DIAS_MES_MEDIO = 30.44;

/**
 * Velocidad de venta implicada: unidades vendidas / meses transcurridos desde startDate hasta fechaCorte.
 * fechaCorte por defecto: hoy (ISO UTC). Devuelve null si falta startDate o unitsSold, o si no ha
 * transcurrido tiempo (meses <= 0). Redondeo a 1 decimal, consistente con los porcentajes.
 */
export function calcularVelocidadVenta(input: ViabilityInput): number | null {
  if (input.startDate === undefined || input.unitsSold === undefined) {
    return null;
  }
  const fechaCorte = input.fechaCorte ?? new Date().toISOString().slice(0, 10);
  const dias = (Date.parse(fechaCorte) - Date.parse(input.startDate)) / 86_400_000;
  const meses = dias / DIAS_MES_MEDIO;
  if (!(meses > 0)) {
    return null;
  }
  return Math.round((input.unitsSold / meses) * 10) / 10;
}

export interface ConsistenciaResult {
  unitsConsistent: boolean;
  warnings: string[];
}

/**
 * Consistencia del modelo de unidades: unitsTotal debe coincidir con la suma de los counts de
 * unit_types, y unitsSold no debe superar unitsTotal. Las inconsistencias NUNCA lanzan excepción:
 * van a warnings (errores explícitos, no fallbacks silenciosos).
 */
export function calcularConsistencia(input: ViabilityInput): ConsistenciaResult {
  const warnings: string[] = [];
  const sumaCounts = input.unitTypes.reduce((acc, u) => acc + u.count, 0);
  const unitsConsistent = input.unitsTotal === sumaCounts;
  if (!unitsConsistent) {
    warnings.push(
      `unitsTotal (${input.unitsTotal}) no coincide con la suma de unit_types (${sumaCounts})`,
    );
  }
  if (input.unitsSold !== undefined && input.unitsSold > input.unitsTotal) {
    warnings.push(`unitsSold (${input.unitsSold}) supera unitsTotal (${input.unitsTotal})`);
  }
  return { unitsConsistent, warnings };
}

/**
 * Coste por unidad: presupuesto total / unitsTotal, euros enteros.
 * División por cero (0 unidades): NaN explícito.
 */
export function calcularCostePorUnidad(totalBudgetEur: number, unitsTotal: number): number {
  if (unitsTotal === 0) {
    return NaN;
  }
  return Math.round(totalBudgetEur / unitsTotal);
}

function totalM2(unitTypes: UnitType[]): number {
  return unitTypes.reduce((acc, u) => acc + u.count * u.avgM2, 0);
}

/**
 * Coste por m2: presupuesto total / Σ(count x avgM2), euros enteros.
 */
export function calcularCostePorM2(totalBudgetEur: number, unitTypes: UnitType[]): number {
  const m2 = totalM2(unitTypes);
  if (m2 === 0) {
    return NaN;
  }
  return Math.round(totalBudgetEur / m2);
}

/**
 * Precio medio por m2: ingresos esperados / Σ(count x avgM2), euros enteros.
 */
export function calcularPrecioMedioM2(revenueExpectedEur: number, unitTypes: UnitType[]): number {
  const m2 = totalM2(unitTypes);
  if (m2 === 0) {
    return NaN;
  }
  return Math.round(revenueExpectedEur / m2);
}

// Umbral por defecto de margen bruto mínimo en fase de estudio (conocimiento corporativo demo: 18-22%).
const UMBRAL_MARGEN_BRUTO_DEFAULT_PCT = 18;

/**
 * Resultado de viabilidad de la promoción: calcula todos los ratios y decide contra el umbral
 * configurable (por defecto 18%). Sin umbral aplicable (margen no calculable, ingresos 0):
 * viable null y umbral null, nunca excepción.
 */
export function calcularViabilidad(input: ViabilityInput, umbrales?: Umbrales): ViabilityResult {
  const revenueExpectedEur = calcularIngresosEsperados(input.unitTypes);
  const { marginBrutoEur, marginBrutoPct } = calcularMargen(
    revenueExpectedEur,
    input.financials.totalBudgetEur,
  );
  const preVentasPct = calcularPreVentas(input.financials.revenueContractedEur, revenueExpectedEur);
  const { unitsConsistent, warnings } = calcularConsistencia(input);
  const umbralMarginAplicadoPct = umbrales?.margenBrutoMinPct ?? UMBRAL_MARGEN_BRUTO_DEFAULT_PCT;
  const viable = Number.isNaN(marginBrutoPct) ? null : marginBrutoPct >= umbralMarginAplicadoPct;
  return {
    revenueExpectedEur,
    marginBrutoEur,
    marginBrutoPct,
    preVentasPct,
    costPerUnitEur: calcularCostePorUnidad(input.financials.totalBudgetEur, input.unitsTotal),
    costPerM2Eur: calcularCostePorM2(input.financials.totalBudgetEur, input.unitTypes),
    avgPriceM2Eur: calcularPrecioMedioM2(revenueExpectedEur, input.unitTypes),
    unitsConsistent,
    speedVentaUdsMes: calcularVelocidadVenta(input),
    viable,
    umbralMarginAplicadoPct: viable === null ? null : umbralMarginAplicadoPct,
    warnings,
  };
}
