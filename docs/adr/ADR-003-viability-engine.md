# ADR-003: Motor de viabilidad como librería Nx TypeScript pura (funciones puras, sin BD)

**Estado:** ✅ Implementado
**Fecha:** Agosto 2026
**Contexto:** decisión de diseño del motor de cálculo central de la promoción, derivada de la spec `docs/specs/viability-engine.md` (aprobada por Jorge el 30/08/2026, tarea 6 del proyecto). Principio KES aplicado: 1.6 (problemas deterministas se resuelven con algoritmos clásicos, no IA) y YAGNI (kavana-tdd-kit).

---

## Contexto

El proyecto modela la empresa demo (promotora ficticia) en `fixtures/companies/kavana-viability-executive/`. Los cálculos de viabilidad hoy viven en hojas de cálculo dispersas: margen bruto, ingresos esperados, pre-ventas, velocidad de venta, costes por unidad y m2. La tarea 6 centraliza esos cálculos en código, con TDD estricto, para que cualquier pantalla o agente del producto (web, API, RAG, agentes) use las mismas cifras. La persistencia no existe aún (llega en la tarea 7).

## Problema

Cada pantalla o agente podría calcular los ratios con su propia fórmula y redondeo, produciendo cifras inconsistentes entre sí y sin tests. Además, sin una fuente única, la discrepancia entre el `projected_margin` del fixture (14,9% para La Marina) y el margen calculado a partir de `price_from` quedaría sin detectar ni documentar.

## Decisión

Construir `libs/viability-engine` como librería **Nx `@nx/js` TypeScript estricto con Jest, compilada con `tsc` (bundler tsc, sin bundler rollup/webpack), de funciones 100% puras: recibe objetos, devuelve objetos, sin I/O ni BD**.

Superficie pública según la spec: `calcularViabilidad(input, umbrales?)` y los helpers `calcularIngresosEsperados`, `calcularMargen`, `calcularPreVentas`, `calcularPrecioMedioM2`. Se añaden dos helpers extra de test directo (documentados abajo): `calcularVelocidadVenta` y `calcularConsistencia`, más `calcularCostePorUnidad` y `calcularCostePorM2` para los costes.

Decisiones concretas:
- **Siempre se calcula el margen**: el `projected_margin` y `projected_margin_pct` del fixture se descartan al calcular (supuesto 2 de la spec, confirmado en la aprobación). La discrepancia 14,9% vs 3,7% calculado para La Marina queda como observación del modelo demo.
- **Umbrales configurables**: `Umbrales { margenBrutoMinPct?: number }`, default 18% (conocimiento corporativo demo: margen bruto objetivo 18-22% en estudio). El umbral aplicado se reporta en el resultado (`umbralMarginAplicadoPct`).
- **Redondeo y errores explícitos**: importes a euros enteros (`Math.round`), porcentajes a 1 decimal. División por cero: en campos tipados `number`, `NaN` explícito (margen %, pre-ventas %, costes); en campos tipados `number | null`, `null` (velocidad, viable, umbral). Nunca excepción silenciosa ni fallback.
- **Inconsistencias a `warnings`**: `unitsTotal != Σ counts` o `unitsSold > unitsTotal` producen warnings en el resultado, nunca excepción.
- **fechaCorte** opcional con default hoy (ISO UTC); con fechaCorte fija el cálculo de velocidad es determinista. Meses = días / 30,44 (días medios por mes); velocidad redondeada a 1 decimal. Velocidad `null` si falta `startDate`, `unitsSold` o si no ha transcurrido tiempo.
- **Tipos exactos de la spec** en `src/lib/types.ts`: `ViabilityInput` (con `fechaCorte` opcional), `ViabilityResult` (con `warnings: string[]`), Strict mode, sin `any`.

## Alternativas evaluadas

| Alternativa | Pro | Contra |
|-------------|-----|--------|
| **Librería Nx TypeScript pura con funciones sin estado (elegida)** | Testable al 100% sin mocks de BD; compartible por web/API/agentes vía path mapping; determinista; cero dependencias nuevas de runtime; lista para persistir en la tarea 7 | El "hoy" por defecto en fechaCorte hace la velocidad no reproducible si no se pasa fechaCorte fija; requiere decisión explícita de redondeo (documentada) |
| Módulo NestJS (servicios + repositorio BD) | Integrado con la API desde el primer día | Enreda el dominio con infraestructura que aún no existe (BD es tarea 7); tests necesitan mocks; cada agente tendría que inyectar el servicio |
| Utilidades dentro de apps/web | Cero estructura nueva | No compartible con API/agentes; duplica lógica o fuerza imports cruzados de apps; viola la separación por librerías del monorepo |
| Script suelto / CLI independiente | Simple de escribir | Sin tipos compartidos con el resto; no integrable en el grafo de Nx; tercera pieza de tooling que mantener |

## Consecuencias

**Positivas:**
- Un único módulo con tests (24 tests, 6 grupos TDD RED-GREEN) verificables a mano con los datos reales de La Marina (22.320.000 € de ingresos, 820.000 € de margen, 3,7%).
- El motor es agnóstico del origen de los datos: la tarea 7 solo tendrá que leer los fixtures/BD y llamar a `calcularViabilidad`.
- Determinista y sin IA (principio KES 1.6); los costes son de cálculo puro.
- La discrepancia del modelo demo queda documentada como observación, no oculta.

**Negativas / tradeoffs:**
- Dos helpers extra fuera de la lista mínima de la spec (`calcularVelocidadVenta`, `calcularConsistencia`, `calcularCostePorUnidad`, `calcularCostePorM2`) para permitir RED/GREEN por grupo sin implementar antes de tiempo la función maestra; son internos de `calcularViabilidad` y no amplían el contrato.
- `NaN` en campos tipados `number` (margen % con ingresos 0) obliga a los consumidores a comprobar `Number.isNaN`; es el "error explícito" elegido, documentado en los tests.
- El generador Nx añadió 4 devDependencies estándar (`jest-environment-node`, `jest-util`, `ts-node`, `jsonc-eslint-parser`) y registró los plugins de inferencia de eslint/jest en `nx.json` (configuración estándar Nx 23).
- `package.json` de la raíz gana el script `viability-engine` (ya pre-existía en HEAD como pre-staging) y 4 devDeps; sin dependencias de runtime nuevas.

## Dónde está

- `libs/viability-engine/src/lib/viability-engine.ts` — implementación de los 6 grupos: helpers puros y `calcularViabilidad`.
- `libs/viability-engine/src/lib/types.ts` — contrato exacto de la spec (`ViabilityInput`, `ViabilityResult`, `Umbrales`).
- `libs/viability-engine/src/lib/viability-engine.spec.ts` — 24 tests con fixture real La Marina + casos sintéticos de límite.
- `libs/viability-engine/src/index.ts` — superficie pública del módulo (`@kavana-viability-executive/viability-engine`).
- `libs/viability-engine/project.json` — targets `build` (@nx/js:tsc), `test` (@nx/jest:jest), `lint` (@nx/eslint:lint).
- `tsconfig.base.json` — path mapping `@kavana-viability-executive/viability-engine` → `libs/viability-engine/src/index.ts`.