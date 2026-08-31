# ADR-004: Persistencia en MongoDB (Mongoose) y motor de viabilidad conectado a BD

**Estado:** ✅ Implementado
**Fecha:** Agosto 2026
**Contexto:** tarea 7 del roadmap. El motor de viabilidad (ADR-003, tarea 6) es una librería pura sin I/O; la spec aprobada dejó la persistencia explícitamente para esta tarea. El repo ya traía tooling previo de MongoDB en `tools/mongodb/` (setup/seed para mongosh). Principio KES aplicado: YAGNI (solo las colecciones con consumidor real) y errores explícitos antes que fallbacks silenciosos.

---

## Contexto

La API NestJS 11 hasta ahora no tenía base de datos: Clerk es la fuente de verdad de usuarios y `syncUserToLocal` solo prepara los datos. El motor `@kavana-viability-executive/viability-engine` recibe objetos y devuelve objetos. Para que los datos demo (fixtures YAML) y los resultados de viabilidad vivan en una fuente única consultable por web, API y futuros agentes (RAG, orquestador), la tarea 7 introduce MongoDB. Jorge eligió MongoDB Atlas con su cuenta existente (a falta de la URI de conexión para la verificación final).

## Problema

Sin persistencia, el motor no tiene datos que calcular (la web no puede listar promociones ni pedir viabilidad) y cada cálculo se pierde. El tooling previo (`tools/mongodb/seed.js`) poblaba colecciones en snake_case pensadas para mongosh y para el RAG futuro, sin consumidor en la API.

## Decisión

Integrar **MongoDB con Mongoose** en la API (patrón estándar NestJS) y conectar el motor puro sin tocar la librería:

- **ODM**: `@nestjs/mongoose@11` + `mongoose@8` (rama estable, compatible con NestJS 11 y Node 20). Conexión vía `MongooseModule.forRootAsync` con `MONGODB_URI` y `MONGODB_DB` (default `kavana_apartaments`) desde ConfigModule. Si falta la URI, la API no arranca con error explícito (nada de fallback silencioso).
- **Colecciones modeladas (solo las del motor)**: `promotions` (schema 1:1 con el fixture YAML en camelCase, con índice único compuesto `(companyId, promotionId)`) y `viability_runs` (histórico inmutable de cálculos: input snapshot + resultado del motor + fechaCorte). Las colecciones de RAG/agentes (knowledge_chunks, scenarios, chat, audit, etc.) se modelan en sus tareas (YAGNI).
- **Motor conectado sin acoplarlo**: `ViabilityService` busca la promoción por `(companyId, promotionId)`, la traduce con un mapper puro (`promotionDocToViabilityInput`) al contrato del motor, calcula, guarda el run y devuelve el resultado. El mapper nunca propaga `projectedMarginEur/Pct` (ADR-003: el margen siempre se calcula).
- **Endpoints**: `GET /promotions` (resumen multi-tenant) y `GET /promotions/:promotionId/viability?fechaCorte=&umbralMarginBrutoMinPct=` (calcula, persiste y devuelve). Protegidos por los guards globales existentes (ClerkAuthGuard + RolesGuard, rol mínimo `viewer`) y aislados por `companyId` del request (claim del token, header `X-Company-ID` o empresa por defecto).
- **Seed**: script standalone en la API (`apps/api/src/seed/seed.ts`, target `nx run api:seed`) que carga `promociones.yaml` en las mismas colecciones de la API, camelCase, idempotente (upsert por `(companyId, promotionId)`), ejecutable con ts-node y `--env-file`. Reemplaza al `tools/mongodb/seed.js` previo (snake_case, sin consumidor): se documenta como obsoleto para promociones, sin borrarlo.
- **Usuarios**: no se modelan en esta tarea. Clerk sigue siendo la fuente de verdad; el modelo `User` se creará cuando el webhook o una feature lo consuma (YAGNI, decisión documentada).

## Alternativas evaluadas

| Alternativa | Pro | Contra |
|-------------|-----|--------|
| **MongoDB + Mongoose en la API (elegida)** | Motor ya pensado para persistir en la tarea 7 (ADR-003); tooling Atlas previo; esquemas flexibles para los fixtures ricos; ODM estándar NestJS | El índice `(companyId, promotionId)` hay que crearlo en el seed; tipos de mongoose con `exactOptionalPropertyTypes` obligan a casts puntuales en el seed |
| SQL (Postgres/Prisma) | Esquema estricto, migraciones maduras | Duplica el stack (ya hay tooling Mongo commiteado); los fixtures con anidados (unitTypes, financials) exigen normalización extra |
| Reutilizar `tools/mongodb/seed.js` + mongosh sin capa Mongoose | Cero código nuevo | Colecciones snake_case sin tipos ni validación; la API tendría que mapear a mano cada lectura; duplica el mapeo en dos formatos |
| Guardar solo el último resultado en la promoción (sin `viability_runs`) | Menos datos | Pierde el histórico auditado de cálculos; sin trazabilidad de cambios de supuestos |

## Consecuencias

**Positivas:**
- El motor sigue siendo 100% puro: la BD solo lo alimenta y guarda su salida.
- 13 tests nuevos (mapper 3 + service 5 + controller 5) con mocks de Mongoose (patrón del repo, sin BD en los tests): suite de la API en 40 tests verdes.
- Multi-tenant real por `companyId` con la infraestructura ya existente (middleware + guards).
- El seed es idempotente y verifica el fixture contra el schema (6 promociones).

**Negativas / tradeoffs:**
- `tools/mongodb/seed.js` (snake_case, mongosh) queda obsoleto para promociones; se mantiene como referencia del diseño previo.
- Sin la URI de Atlas la API no arranca (error explícito): exige configurar `MONGODB_URI` en `apps/api/.env` (gitignored) antes de servir.
- El RBAC fino por rol real se aplicará cuando haya más de un rol en uso; hoy el mínimo `viewer` con la jerarquía existente.
- `mongoose.models[]` devuelve `Model<any>`: en el seed se tipa explícitamente y se usa un cast localizado en `$set` (documentado, sin `any` en el código de la app).

## Dónde está

- `apps/api/src/viability/promotion.schema.ts` — schema `promotions` (1:1 con el fixture, camelCase, índice tenant).
- `apps/api/src/viability/viability-run.schema.ts` — schema `viability_runs` (input + resultado + fechaCorte).
- `apps/api/src/viability/promotion.mapper.ts` — adaptador puro doc → `ViabilityInput`.
- `apps/api/src/viability/viability.service.ts` — orquesta BD + motor + guardado del run.
- `apps/api/src/viability/promotions.controller.ts` — `GET /promotions` y `GET /promotions/:id/viability`.
- `apps/api/src/viability/viability.module.ts` — módulo NestJS (forFeature de los 2 modelos).
- `apps/api/src/app/app.module.ts` — `MongooseModule.forRootAsync` global.
- `apps/api/src/seed/seed.ts` — seed idempotente desde `promociones.yaml` (`nx run api:seed`).
- `apps/api/.env.example` — documenta `MONGODB_URI` y `MONGODB_DB`.