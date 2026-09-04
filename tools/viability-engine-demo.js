/**
 * viability-engine-demo.js
 * ========================
 *
 * Standalone demo: usa libs/viability-engine FUERA de NestJS/Angular, importando
 * la build CommonJS compilada en dist/. Sirve como evidencia de que el motor es
 * una librería de funciones puras reutilizable (ADR-003) y como smoke-test
 * ejecutable sin levantar el backend.
 *
 * USO
 * ---
 *   # desde la raíz del monorepo /root/kavana-viability-executive
 *   node tools/viability-engine-demo.js
 *
 *   # o equivalente
 *   node --require ts-node/register tools/viability-engine-demo.ts   (versión .ts)
 *
 * REQUISITOS
 * ----------
 *   - La lib viability-engine debe estar compilada (nx build viability-engine o
 *     npm run viability-engine). Sin dist/libs/viability-engine/src/index.js
 *     este script falla con un error claro de require().
 *   - Sin dependencias nuevas: usa solo node built-ins + la lib interna.
 *
 * NOTA SOBRE FORMATO NUMERICO
 * ---------------------------
 *   KAVANA usa formato español: punto para miles, coma para decimales
 *   (ej. 22.320.000 €, 3,7 %). Las funciones puras devuelven números JS
 *   estándar (punto decimal inglés), así que el formateo a español vive en
 *   este script de presentación, nunca en el motor.
 */

'use strict';

const path = require('path');
const repoRoot = path.resolve(__dirname, '..');

// 1) Importación de la librería compilada (CommonJS).
//    El package.json de dist/libs/viability-engine apunta a ./src/index.js.
const enginePath = path.join(repoRoot, 'dist', 'libs', 'viability-engine');
const { calcularViabilidad } = require(enginePath);

// ---------------------------------------------------------------------------
// Helpers de formato (español): punto para miles, coma para decimales.
// ---------------------------------------------------------------------------

const fmtEur0 = (n) =>
  Number.isNaN(n)
    ? 'NaN'
    : `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(n)} €`;

const fmtEur1 = (n) =>
  Number.isNaN(n)
    ? 'NaN'
    : `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)} €`;

const fmtPct1 = (n) =>
  Number.isNaN(n)
    ? 'NaN'
    : `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)}%`;

const fmtBool = (b) => (b === null ? 'null' : b ? 'sí' : 'no');

function printBloque(titulo, input, result) {
  console.log('━'.repeat(72));
  console.log(`▶ ${titulo}`);
  console.log(`  id: ${input.id} · unidades: ${input.unitsTotal}`);
  console.log('━'.repeat(72));
  console.log(`  Ingresos esperados ........ ${fmtEur0(result.revenueExpectedEur)}`);
  console.log(`  Margen bruto .............. ${fmtEur0(result.marginBrutoEur)}  (${fmtPct1(result.marginBrutoPct)})`);
  console.log(`  Pre-ventas ................ ${fmtPct1(result.preVentasPct)}`);
  console.log(`  Coste por unidad .......... ${fmtEur0(result.costPerUnitEur)}`);
  console.log(`  Coste por m² .............. ${fmtEur1(result.costPerM2Eur)}`);
  console.log(`  Precio medio m² ........... ${fmtEur1(result.avgPriceM2Eur)}`);
  console.log(`  Consistencia unidades ..... ${fmtBool(result.unitsConsistent)}`);
  console.log(
    `  Velocidad de venta ........ ${
      result.speedVentaUdsMes === null
        ? 'null (datos insuficientes)'
        : `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(result.speedVentaUdsMes)} uds/mes`
    }`,
  );
  console.log(
    `  ¿Viable? .................. ${fmtBool(result.viable)} (umbral aplicado: ${
      result.umbralMarginAplicadoPct === null
        ? 'null'
        : `${fmtPct1(result.umbralMarginAplicadoPct).replace('%', ' %')}`
    })`,
  );
  if (result.warnings.length > 0) {
    console.log(`  Warnings:`);
    result.warnings.forEach((w) => console.log(`    · ${w}`));
  } else {
    console.log(`  Warnings: (ninguno)`);
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// CASO 1 — La Marina (fixture real, igual al spec test).
//   Cifras verificadas a mano:
//     ingresos = 24·185000 + 56·235000 + 16·295000 = 22.320.000 €
//     margen   = 22.320.000 − 21.500.000 = 820.000 €  (3,7 %)
//     pre-ventas = 19.200.000 / 22.320.000 = 86,0 %
//     coste/ud = 21.500.000 / 96 = 223.958 €
//     m² totales = 24·72 + 56·92 + 16·115 = 8.720 m²
//     coste/m²  = 21.500.000 / 8.720 = 2.466 €
//     precio medio m² = 22.320.000 / 8.720 = 2.560 €
//     velocidad = 82 / ((2026-08-30 − 2023-04-15) / 30,44) ≈ 2,0 uds/mes
// ---------------------------------------------------------------------------

const laMarina = {
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

// ---------------------------------------------------------------------------
// CASO 2 — Promoción claramente viable: mismo proyecto La Marina, pero con un
//  umbral del 3% (en lugar del 18% por defecto). margen 3,7 % >= 3 % → sí viable.
//  Demuestra que el umbral es configurable y que la decisión se revierte sin
//  tocar los datos ni las funciones puras.
// ---------------------------------------------------------------------------

const laMarinaViable = { ...laMarina, id: 'promo-la-marina-2 (umbral 3 %)' };

// ---------------------------------------------------------------------------
// CASO 3 — Promoción no viable: La Marina con un umbral exigente del 25 %.
//  margen 3,7 % < 25 % → no viable. Misma entrada, distinta conclusión.
// ---------------------------------------------------------------------------

const laMarinaNoViable = { ...laMarina, id: 'promo-la-marina-2 (umbral 25 %)' };

// ---------------------------------------------------------------------------
// CASO 4 — Datos faltantes (manejo de errores controlado).
//  Sin startDate ni unitsSold → velocidadVenta null, viable sigue calculándose
//  con el resto de la información. Demuestra que el motor degrada con
//  elegancia (errores explícitos, no excepciones silenciosas).
// ---------------------------------------------------------------------------

const sinDatosTemporales = {
  id: 'promo-sin-fechas',
  unitsTotal: 96,
  unitTypes: laMarina.unitTypes,
  financials: laMarina.financials,
  // startDate: undefined  → velocidadVenta = null
  // unitsSold: undefined  → velocidadVenta = null
};

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------

console.log('');
console.log('Demo standalone · libs/viability-engine · fuera de NestJS');
console.log('Importación: dist/libs/viability-engine (CommonJS compilado)');
console.log('');

printBloque(
  'CASO 1 · La Marina (umbral por defecto 18 %)',
  laMarina,
  calcularViabilidad(laMarina),
);

printBloque(
  'CASO 2 · Misma La Marina, umbral bajo 3 % → claramente VIABLE',
  laMarinaViable,
  calcularViabilidad(laMarinaViable, { margenBrutoMinPct: 3 }),
);

printBloque(
  'CASO 3 · Misma La Marina, umbral alto 25 % → NO VIABLE',
  laMarinaNoViable,
  calcularViabilidad(laMarinaNoViable, { margenBrutoMinPct: 25 }),
);

printBloque(
  'CASO 4 · Sin startDate ni unitsSold → velocidadVenta null, viable aún se calcula',
  sinDatosTemporales,
  calcularViabilidad(sinDatosTemporales),
);

console.log('Fin de la demo. Cuatro llamadas puras a calcularViabilidad(), sin NestJS.');