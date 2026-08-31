# METRICS.md — Qué cubren los tests y tamaño real del código

*Cifras verificadas contra el código real el 31/08/2026 (ejecución local de `nx run-many -t test lint build --all`).*

## Tests: qué cubren (no solo cuántos)

**64 tests en 9 suites** (40 en la API y 24 en el motor de viabilidad), todos verdes en la verificación del 31/08/2026:

| Suite | Tests | Qué cubre |
|-------|-------|-----------|
| `clerk.service.spec.ts` | 8 | Verificación de tokens (éxito y fallo), obtención de usuario, sync local, gestión de metadata y roles |
| `guards/roles.guard.spec.ts` | 7 | Jerarquía de roles (`super_admin` → `viewer`), permisos, combinación roles+permisos, ausencia de restricciones |
| `guards/clerk-auth.guard.spec.ts` | 6 | Ruta pública, token válido, token ausente, token inválido, adjuntado de `company_id`/rol/permisos al request |
| `middleware/company-id.middleware.spec.ts` | 3 | `company_id` ya seteado, header `X-Company-ID`, valor por defecto |
| `clerk-webhook.controller.spec.ts` | 3 | Firma Svix válida, firma inválida, payload alterado (verificación sobre cuerpo crudo) |
| `viability/promotion.mapper.spec.ts` | 3 | Traducción del documento MongoDB al contrato del motor (`promotionDocToViabilityInput`), sin propagar `projectedMarginEur/Pct` (ADR-003) |
| `viability/viability.service.spec.ts` | 5 | Búsqueda de promoción por `(companyId, promotionId)`, cálculo con el motor, guardado del run y errores explícitos |
| `viability/promotions.controller.spec.ts` | 5 | `GET /promotions` (multi-tenant) y `GET /promotions/:id/viability`: guards, parámetros y respuestas |
| `libs/viability-engine` (`viability-engine.spec.ts`) | 24 | Motor puro: ingresos esperados, margen bruto (€ y %), pre-ventas y velocidad de venta, consistencia de unidades, costes por unidad y por m², precio medio m² y viabilidad contra umbral |

**Lo que NO cubren todavía** (honestidad): integración real con Clerk (requiere claves), flujo de login en navegador, e2e de la web (la app `api-e2e` existe pero su target es e2e sin suite ejecutada en CI).

## Código real (excluye node_modules, specs y plantilla nx-welcome)

| Área | Ficheros | LOC |
|------|----------|-----|
| `apps/api/src` | 23 | 1.425 |
| `apps/web/src` | 12 | 329 |
| `libs/viability-engine/src` | 3 | 205 |
| **Total** | **38** | **1.959** |

*Conteo: ficheros `.ts` (sin specs ni la plantilla `nx-welcome` de la web), LOC con `wc -l`.*

- **Stack**: TypeScript 6.0.3 en todo el repo (Angular 22.0.4, NestJS 11, Nx 23.1.2, Node >= 20, recomendado 22.x).
- **Relación doc/código**: intencionalmente alta: cada decisión con alternativas (4 ADRs), spec de producto, historia y métricas. El dominio (viabilidad inmobiliaria) se documenta antes de implementarse (tareas 8 a 10).

## Estado CI (30/08/2026, actualizado el 31/08/2026)

- **Resuelto:** `ts-jest` subido a 29.4.12 (peer `typescript >=4.3 <7`); 64/64 tests verdes (24 del motor + 40 de la API), lint sin errores (1 warning `no-console` preexistente en `apps/web/src/server.ts`) y builds de api y web correctos en local con TypeScript 6.0.3 (verificado el 31/08/2026: `nx run-many -t test lint build --all`, 8 tareas, 1 con cache local).
- Primer `npm ci` de GitHub Actions fue rojo por `ERESOLVE` (`ts-jest@29.2.6` ↔ TypeScript 6.0.3); con la resolución, el `npm ci` del push posterior ya valida. Detalle en [ADR-002](adr/ADR-002-despliegue-cicd.md).