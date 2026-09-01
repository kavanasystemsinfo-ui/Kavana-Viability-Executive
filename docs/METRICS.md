# METRICS.md — Qué cubren los tests y tamaño real del código

*Cifras verificadas contra el código real el 31/08/2026 (ejecución local de `nx run-many -t test lint build --all`, commit `c372635` en `main`).*

## Tests: qué cubren (no solo cuántos)

**66 tests en 11 suites** (42 en la API y 24 en el motor de viabilidad), todos verdes en la verificación del 31/08/2026:

| Suite | Tests | Qué cubre |
|-------|-------|-----------|
| `apps/api/src/auth/clerk.service.spec.ts` | 8 | Verificación de tokens (éxito y fallo), obtención de usuario, sync local, gestión de metadata y roles |
| `apps/api/src/auth/guards/roles.guard.spec.ts` | 7 | Jerarquía de roles (`super_admin` → `viewer`), permisos, combinación roles+permisos, ausencia de restricciones |
| `apps/api/src/auth/guards/clerk-auth.guard.spec.ts` | 6 | Ruta pública, token válido, token ausente, token inválido, adjuntado de `company_id`/rol/permisos al request |
| `apps/api/src/auth/middleware/company-id.middleware.spec.ts` | 3 | `company_id` ya seteado, header `X-Company-ID`, valor por defecto |
| `apps/api/src/auth/clerk-webhook.controller.spec.ts` | 3 | Firma Svix válida, firma inválida, payload alterado (verificación sobre cuerpo crudo) |
| `apps/api/src/auth/clerk-auth.module.spec.ts` | 5 | Composición del módulo `ClerkAuthModule` (mocks de `@nestjs/config` con `forFeature` que provee y exporta ConfigService; el resto es código real) |
| `apps/api/src/viability/promotion.mapper.spec.ts` | 3 | Traducción del documento MongoDB al contrato del motor (`promotionDocToViabilityInput`), sin propagar `projectedMarginEur/Pct` ([ADR-003](adr/ADR-003-viability-engine.md)) |
| `apps/api/src/viability/viability.service.spec.ts` | 5 | Búsqueda de promoción por `(companyId, promotionId)`, cálculo con el motor, guardado del run y errores explícitos |
| `apps/api/src/viability/promotions.controller.spec.ts` | 5 | `GET /promotions` (multi-tenant) y `GET /promotions/:id/viability`: guards, parámetros y respuestas |
| `apps/api-e2e/src/api/api.spec.ts` | 1 | Suite e2e de la app `api-e2e` (placeholder del generador Nx; sin asserts ejecutados en CI todavía) |
| `libs/viability-engine/src/lib/viability-engine.spec.ts` | 24 | Motor puro: ingresos esperados, margen bruto (€ y %), pre-ventas y velocidad de venta, consistencia de unidades, costes por unidad y por m², precio medio m² y viabilidad contra umbral |

**Lo que NO cubren todavía** (honestidad, directiva de calidad): integración real con Clerk (requiere claves), flujo de login en navegador, e2e de la web. La verificación real end-to-end se hizo en la saga del ADR-006 (API arrancando contra Atlas con `MONGODB_URI` real, `GET /api/promotions` 401 sin token, suite verde).

## Código real (excluye node_modules, specs y plantilla nx-welcome)

| Área | Ficheros | LOC |
|------|----------|-----|
| `apps/api/src` | 23 | 1.426 |
| `apps/web/src` | 12 | 329 |
| `libs/viability-engine/src` | 3 | 205 |
| **Total** | **38** | **1.960** |

*Conteo: ficheros `.ts` (sin specs ni la plantilla `nx-welcome` de la web), LOC con `wc -l`.*

- **Stack**: TypeScript 6.0.3 en todo el repo (Angular 22.0.4, NestJS 11, Nx 23.1.2, Node >= 20, recomendado 22.x).
- **Relación doc/código**: intencionalmente alta: 7 ADRs con alternativas evaluadas, spec de producto, spec del motor, historia y métricas. El dominio (viabilidad inmobiliaria) se documenta antes de implementarse (tareas 8 a 10).

## Estado CI (31/08/2026)

- **Resuelto:** `ts-jest` subido a 29.4.12 (peer `typescript >=4.3 <7`); 66/66 tests verdes (24 del motor + 42 de la API), lint sin errores y builds de api y web correctos en local con TypeScript 6.0.3 (verificado el 31/08/2026: `nx run-many -t test lint build --all`, 8 tareas, 1 con cache local).
- Primer `npm ci` de GitHub Actions fue rojo por `ERESOLVE` (`ts-jest@29.2.6` ↔ TypeScript 6.0.3); con la resolución, el `npm ci` del push posterior ya valida. Detalle en [ADR-002](adr/ADR-002-despliegue-cicd.md).

## Verificación contra BD real (31/08/2026)

- `nx serve api` con `MONGODB_URI` real (usuario `ka_test`, cluster compartido `kavanasystems.nbsqpou.mongodb.net`, BD `kavana_apartaments`): arranca sin error. Log "Nest application successfully started" + "Kavana Viability Executive API running on: http://localhost:3000/api".
- `GET /api` sin token → 401 `{"message":"Missing or invalid Authorization header"}` (guard de Clerk).
- `GET /api/promotions` sin token → 401 (idem). El smoke test del API viva + guard activo + Mongo conectado es la verificación estándar de un arranque limpio.
- Detalle de la saga de bad auth que hizo falta para llegar aquí: [ADR-006](adr/ADR-006-mongodb-atlas-bad-auth.md).