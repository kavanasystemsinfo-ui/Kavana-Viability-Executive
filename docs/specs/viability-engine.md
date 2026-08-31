# Spec: Motor de viabilidad (`viability-engine`)

**Estado:** ✅ Aprobada por Jorge el 30/08/2026 (defaults: umbral 18% configurable, margen siempre calculado, fecha de corte por defecto hoy)
**Fecha:** 30/08/2026
**Relacionado:** [spec de producto](producto.md) · ADR-001 (stack, lógica determinista sin IA)

## 1. Problema

Una promotora necesita saber, para cada promoción, si los números cuadran: qué margen deja, sobre qué ingresos, con qué ritmo de ventas y qué nivel de pre-venta comprometida. Hoy esos cálculos viven en hojas de cálculo dispersas (supuesto del modelo demo). El motor centraliza el cálculo en código, con tests, para que cualquier pantalla o agente del producto use las mismas cifras.

## 2. Contexto de dominio (modelo demo)

El repo modela la empresa demo (promotora ficticia) en `fixtures/companies/kavana-viability-executive/`:

- `docs/promociones.yaml`: 6 promociones con `unit_types` (tipo, count, avg_m2, price_from_eur), `financials` (land_cost, construction_budget, construction_spent, total_budget, revenue_contracted, projected_margin, projected_margin_pct) y `financing` (loan_amount, drawn, interest_rate).
- `docs/conocimiento_corporativo.md`: ratios de referencia del sector (margen bruto objetivo 18-22%, margen neto 12-16%, pre-ventas mínimas para financiación 30%, velocidad de venta objetivo 1,0-1,5 uds/mes, etc.).

**Advertencia de honestidad:** estos datos son el modelo de empresa demo del proyecto, no la empresa real de Jorge. El motor se construye sobre esta estructura; las cifras reales, cuando existan, se cargarán como inputs.

## 3. Alcance (primera iteración, YAGNI)

**SÍ calcula (funciones puras, TypeScript, sin I/O, sin BD):**

1. **Ingresos esperados** de la promoción: sumatorio de `unit_type.count × unit_type.price_from_eur`, más `revenue_contracted_eur` como ingresos ya comprometidos (no se suman: son parte de los esperados, se reportan por separado).
2. **Margen bruto proyectado** (€ y %): `revenue_esperado - total_budget_eur` y `÷ revenue_esperado × 100`.
3. **Consistencia del modelo**: verificación de que `units_total = Σ unit_types.count` y que las unidades vendidas/disponibles suman el total (si los datos lo permiten).
4. **Ratios comerciales**: pre-ventas % (`revenue_contracted / revenue_esperado`), velocidad de venta implicada (`units_sold / meses desde start_date`), precio medio por m2 (`revenue_esperado / Σ(count×avg_m2)`).
5. **Coste por unidad y por m2**: `total_budget / units_total` y `total_budget / Σ m2`.
6. **Resultado de viabilidad**: booleano/criterio contra umbrales configurables (por defecto los del conocimiento corporativo demo: margen bruto ≥ 18% en fase de estudio; documentar el umbral usado en el output).

**NO hace (fuera de alcance en esta iteración):**

- Sensibilidad a tipos de interés ni escenarios probabilísticos (los escenarios de `escenarios.yaml` son para el orquestador, tarea 9).
- Persistencia (la BD llega con la tarea 7): el motor recibe objetos y devuelve objetos.
- Financiación (LTV, DSCR) sin input de tasación: requiere datos que el modelo no incluye; queda como segunda iteración si Jorge lo pide.
- IA: todo el cálculo es determinista (principio KES 1.6).

## 4. Entrada y salida (contrato TypeScript)

```ts
// Entrada: modelo reducido de promoción (es el que ya existe en promociones.yaml)
interface ViabilityInput {
  id: string;
  unitsTotal: number;
  unitTypes: Array<{
    type: string; count: number; avgM2: number; priceFromEur: number;
  }>;
  financials: {
    landCostEur: number;
    constructionBudgetEur: number;
    totalBudgetEur: number;
    revenueContractedEur: number;
  };
  startDate?: string;          // ISO, para velocidad de venta
  fechaCorte?: string;         // ISO, opcional: fecha de referencia para velocidad (default: hoy)
  unitsSold?: number;
}

// Salida
interface ViabilityResult {
  revenueExpectedEur: number;
  marginBrutoEur: number;
  marginBrutoPct: number;      // porcentaje, 1 decimal
  preVentasPct: number;        // revenue_contracted / revenue_expected
  costPerUnitEur: number;
  costPerM2Eur: number;
  avgPriceM2Eur: number;
  unitsConsistent: boolean;    // units_total == Σ counts (+ sold+available si hay)
  speedVentaUdsMes: number | null;  // null si falta startDate o unitsSold
  viable: boolean | null;      // null si no hay umbral aplicable
  umbralMarginAplicadoPct: number | null;
  warnings: string[];          // inconsistencias de datos, sin lanzar excepciones
}
```

**Reglas de precisión (KAVANA):** redondeo a euros enteros en importes, porcentajes a 1 decimal; división por cero devuelve `null`/`NaN` explícito, nunca excepción silenciosa; inconsistencias de datos van a `warnings`, no se lanzan excepciones (errores explícitos, no fallbacks silenciosos).

## 5. Umbrales por defecto (configurables, no hardcodeados en el cálculo)

| Métrica | Valor demo de referencia | Nota |
|---|---|---|
| Margen bruto mínimo (estudio) | 18% | conocimiento_corporativo (18-22% objetivo) |
| Pre-ventas mínimas financiación | 30% | solo informativo en esta iteración |

## 6. Superficie pública (API del módulo)

- `calcularViabilidad(input: ViabilityInput, umbrales?: Umbrales): ViabilityResult`
- Helpers puros exportados para test directo: `calcularIngresosEsperados`, `calcularMargen`, `calcularPreVentas`, `calcularPrecioMedioM2`.

## 7. Plan TDD (RED → GREEN → REFACTOR)

1. RED: ingresos esperados con 1 y 3 tipos de unidad (caso La Marina, esperado verificable a mano).
2. RED: margen bruto € y % (caso La Marina: 21,5M€ presupuesto, ingresos esperados calculados → %).
3. RED: pre-ventas % y velocidad de venta (La Marina: 82/96 uds, meses desde abr-2023).
4. RED: consistencia de unidades (caso válido y caso inconsistente → `warnings`).
5. RED: coste por unidad y m2, precio medio m2.
6. RED: umbral de viabilidad: caso viable y caso no viable, y `null` sin umbral.
7. GREEN: implementación mínima que pasa la suite; REFACTOR: pureza, nombres, sin `any`.

## 8. Supuestos a validar por Jorge

1. **Fórmula de ingresos**: ¿los ingresos esperados totales son `Σ(count × price_from)` (a tabla completa) o deben usar precios medios de venta reales? (El modelo solo tiene price_from; se puede refinar al tener datos reales.)
2. **Margen**: ¿el `projected_margin` del fixture debe poder venir como input (dato ya existente) o siempre se calcula? Propuesta: se calcula siempre; el del fixture se descarta al calcular.
3. **Umbral de viabilidad**: ¿18% de margen bruto es el criterio correcto para "viable", o debe ser configurable por fase (estudio vs ejecución)?
4. **Velocidad de venta**: fecha de corte para los meses transcurridos: ¿hoy (fecha actual) o una fecha de referencia fija en el input?

## 9. Entrega esperada

- Lib `libs/viability-engine` (Nx, `@nx/js`, TypeScript estricto, Jest) con la API anterior y suite completa GREEN.
- Incluir docs/adr/ADR-003-viability-engine.md (decisión de diseño: funciones puras, sin BD, umbrales configurables).
- Tests cubriendo los 6 grupos del plan; sin `any`, sin dependencias externas nuevas.