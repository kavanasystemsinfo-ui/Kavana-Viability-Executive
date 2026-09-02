# DECISIONS.md

Índice cronológico de decisiones de arquitectura del proyecto, con su estado y la verificación de la documentación contra el código real. Cada ADR resume el contexto, la decisión, las alternativas evaluadas y las consecuencias; este índice es el punto de entrada para un ingeniero que se incorpora al proyecto.

## Índice de ADRs

| # | Título | Estado | Fecha |
|---|--------|--------|-------|
| [ADR-001](docs/adr/ADR-001-stack.md) | Stack: monorepo Nx (Angular SSR + NestJS) | ✅ Implementado | 29/08/2026 (sesión de ideas) |
| [ADR-002](docs/adr/ADR-002-despliegue-cicd.md) | Despliegue y CI/CD (GH Actions + Vercel + Render) | ✅ Implementado (CI resuelto; web en Vercel; API pendiente del hook de Render) | 30/08/2026 |
| [ADR-003](docs/adr/ADR-003-viability-engine.md) | Motor de viabilidad como librería Nx TypeScript pura (funciones puras, sin BD) | ✅ Implementado | 30/08/2026 |
| [ADR-004](docs/adr/ADR-004-persistencia-mongodb.md) | Persistencia MongoDB (Mongoose) y motor conectado a BD | ✅ Implementado y verificado contra Atlas real | 30/08/2026 / 31/08/2026 |
| [ADR-005](docs/adr/ADR-005-rebrand-kavana-viability-executive.md) | Rebrand a Kavana Viability Executive + roadmap congelado del satélite Kavana Executive | ✅ Implementado (mergeado en `main`, commit `c372635`) | 31/08/2026 |
| [ADR-006](docs/adr/ADR-006-mongodb-atlas-bad-auth.md) | Saga MongoDB Atlas `bad auth`: diagnóstico diferencial y causa raíz | ✅ Implementado (verificación de la tarea 7 cerrada) | 31/08/2026 |
| [ADR-007](docs/adr/ADR-007-directiva-calidad-y-modelo-relacion.md) | Directiva de calidad de reporting y modelo de relación equipo-cliente | ✅ Implementado (directiva adoptada el 31/08/2026) | 31/08/2026 |
| [ADR-008](docs/adr/ADR-008-dashboard-angular.md) | Dashboard Angular (tarea 10): stack visual, datos, RBAC, chat y server routes | 🚧 Aprobado; fase 1 en implementación | 02/09/2026 |

## Resumen ejecutivo (una línea por ADR)

1. **ADR-001 — Stack.** Monorepo Nx 23 (Angular 22 SSR + NestJS 11) con un solo lenguaje (TypeScript 6); Clerk como auth gestionada; libs por dominio para que web, API y futuros agentes compartan tipos y motor.
2. **ADR-002 — Despliegue.** GitHub Actions como CI (lint + test + build, branch protection), Vercel para la web SSR, Render para la API con blueprint y deploy hook. El primer push quedó rojo por `ERESOLVE` (`ts-jest@29.2.6` ↔ TypeScript 6.0.3); resuelto subiendo `ts-jest` a 29.4.12.
3. **ADR-003 — Motor.** Librería Nx pura con funciones deterministas: ingresos esperados, margen bruto (€ y %), pre-ventas, velocidad de venta, consistencia, costes por unidad y m², umbral de viabilidad. 24 tests con TDD estricto sobre la fixture La Marina. Sin IA, sin BD, sin mocks.
4. **ADR-004 — Persistencia.** MongoDB Atlas + Mongoose en la API; `ViabilityService` busca la promoción por `(companyId, promotionId)`, la traduce con un mapper puro al contrato del motor, calcula y guarda el run. Endpoints `GET /api/promotions` y `GET /api/promotions/:promotionId/viability`. Seed idempotente desde YAML.
5. **ADR-005 — Rebrand.** Producto renombrado de Kavana Apartaments a Kavana Viability Executive; el satélite de gestión de inmobiliarias se llamará Kavana Executive y queda congelado sin implementar (decisión de arquitectura: monorepo Nx con dos apps NestJS separadas, integradas por API). Cambios mínimos: nombre del repo, aliases, fixtures, `companyId` por defecto. No se tocan la BD Mongo ni los secretos (decisión consciente para evitar otro ciclo de bad auth).
6. **ADR-006 — Bad auth.** Diagnóstico diferencial en 6 rondas para resolver `bad auth` (código 8000) de Atlas. Causa raíz: el usuario `kavana_apartaments_user` se creó sin completar el guardado final de la contraseña en Atlas. Fix: usuario nuevo `ka_test` desde cero con el flujo completo. Aprendizaje reusable: ante `bad auth` ambiguo, separar causas con pruebas controladas antes de resetear.
7. **ADR-007 — Proceso.** Reporting obligatorio en tres estados (IMPLEMENTADO / VERIFICADO / DESPLEGADO) con evidencia citada por nombre y read-back del destino real. Modelo de relación: Jorge define el qué (producto, negocio), Elías decide el cómo (arquitectura, implementación). Solo se escala en decisiones de producto o en operaciones irreversibles.

## Verificación de la documentación contra el código (31/08/2026)

- **Tests reales**: 66 tests en 11 suites (24 del motor + 42 de la API), todos verdes en la ejecución local de `nx run-many -t test lint build --all` (Node 20.20.2, TypeScript 6.0.3). Detalle por suite en `docs/METRICS.md`.
- **CI en GitHub**: ❌ ROJO en el primer push (30/08/2026): `npm ci` fallaba con `ERESOLVE` (`ts-jest@29.2.6` exige TypeScript <6 y el repo usa 6.0.3). ✅ RESUELTO: `ts-jest` 29.4.12 (peer `typescript >=4.3 <7`); suite y builds locales verificados en verde y el `npm ci` de CI validado en el push posterior.
- **Deploys**: Web desplegada en Vercel (30/08/2026, `kavana-viability-executive.vercel.app`, HTTP 200). Pendiente: `RENDER_DEPLOY_HOOK_URL` (manual de Jorge en Render) para desplegar la API; la URI de MongoDB Atlas quedó verificada el 31/08/2026 tras la saga del ADR-006.
- **Stack en código**: `package.json` verificado (Angular 22.0.4, NestJS 11, Nx 23.1.2, TS 6.0.3, Clerk 6.30.2, svix 1.99.1, mongoose 8, @nestjs/mongoose 11).
- **Narrativa histórica**: los ADRs 001 a 004 conservan sus cuerpos tal como se escribieron; solo se han actualizado las referencias a paths actuales cuando el rebrand las invalida. Los nombres viejos que aparecen en su contexto narrativo se conservan como registro de la decisión en su momento (directiva del ADR-005).