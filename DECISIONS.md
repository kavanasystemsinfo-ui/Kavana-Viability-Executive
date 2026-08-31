# DECISIONS.md

Índice de decisiones de arquitectura del proyecto, con su estado y la verificación de la documentación contra el código real.

## Índice de ADRs

| # | Título | Estado | Fecha |
|---|--------|--------|-------|
| [ADR-001](docs/adr/ADR-001-stack.md) | Stack: monorepo Nx (Angular SSR + NestJS) | ✅ Implementado | Ago 2026 |
| [ADR-002](docs/adr/ADR-002-despliegue-cicd.md) | Despliegue y CI/CD (GH Actions + Vercel + Render) | ✅ Implementado (CI resuelto; web desplegada en Vercel; API pendiente del hook de Render) | Ago 2026 |
| [ADR-003](docs/adr/ADR-003-viability-engine.md) | Motor de viabilidad como librería Nx TypeScript pura (funciones puras, sin BD) | ✅ Implementado | Ago 2026 |
| [ADR-004](docs/adr/ADR-004-persistencia-mongodb.md) | Persistencia MongoDB (Mongoose) y motor conectado a BD | ✅ Implementado (falta URI Atlas para verificación final) | Ago 2026 |

## Resumen ejecutivo

1. **Stack**: un solo lenguaje (TypeScript 6) en todo el repo. Web Angular 22 SSR (SEO y producto), API NestJS 11 (auth, RBAC, multi-tenant). Nx 23 como orquestador del monorepo. Autenticación gestionada por Clerk.
2. **Multi-tenant**: cada petición autenticada lleva `company_id` (del token de sesión de Clerk, con fallback al header `X-Company-ID` y a `kavana_viability_executive` como empresa por defecto).
3. **RBAC**: jerarquía de roles `super_admin > admin > director > jefe_proyecto > analista > comercial > viewer`, con permisos adicionales vía decorators `@Roles()` / `@Permissions()`.
4. **Seguridad de webhooks**: firma Svix verificada sobre el cuerpo crudo (`rawBody`) en `POST /api/webhooks/clerk`; ruta pública, el resto de la API es privada por guards globales.
5. **Persistencia**: Clerk es la fuente de verdad de usuarios; la base de datos propia (tarea 7, ADR-004) persiste promociones y runs de viabilidad con seed desde fixtures. Se descartó montar BD antes de tiempo (YAGNI), hasta que el motor (tarea 6) tuvo datos que calcular.
6. **Despliegue**: GitHub Actions (calidad) + Vercel (web SSR) + Render (API, plan free). Secretos en las plataformas, nunca en el repo.

## Verificación de la documentación (30/08/2026, actualizada el 31/08/2026)

- **Tests reales**: 64 tests en 9 suites (API: clerk.service 8 · roles.guard 7 · clerk-auth.guard 6 · company-id.middleware 3 · clerk-webhook.controller 3 · viability.service 5 · promotions.controller 5 · promotion.mapper 3; motor: viability-engine 24). Verificados con `nx run-many -t test lint build --all` (31/08/2026, salida en verde, Node 20.20.2) y contando `it(`/`test(` en los spec.
- **CI en GitHub**: ❌ ROJO en el primer push (30/08/2026): `npm ci` fallaba con `ERESOLVE` (`ts-jest@29.2.6` exige TypeScript <6 y el repo usa 6.0.3). Causa exacta leída del log de Actions. **Resuelto**: `ts-jest` 29.4.12 instalado (soporta TypeScript <7); suite y builds locales verificados en verde y el `npm ci` de CI validado en el push posterior.
- **Deploys**: Web desplegada en Vercel (30/08/2026, producción en kavana-viability-executive.vercel.app, HTTP 200). Secrets del CI configurados en GitHub: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Pendiente: `RENDER_DEPLOY_HOOK_URL` (generar el hook en Render, manual) y URI de MongoDB Atlas para la verificación final de la tarea 7 (el código de persistencia está implementado, ver ADR-004).
- **Stack en código**: `package.json` verificado (Angular 22.0.4, NestJS 11, Nx 23.1.2, TS 6.0.3, Clerk 6.30.2, svix 1.99.1).
- **URLs de despliegue**: pendientes de los primeros deploys (supuesto a validar).