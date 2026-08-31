# 📜 Historia del Proyecto

## Fase 1: Fundación del monorepo (Agosto 2026)

**Decisión:** [ADR-001](adr/ADR-001-stack.md) — monorepo Nx 23 con Angular 22 SSR y NestJS 11.
**Resultado:** ✅ workspace npm con `apps/web`, `apps/api` y targets de lint, test y build.
**Lección:** elegir un solo lenguaje de entrada a salida (TypeScript) reduce el coste de mantener un equipo de 1.

## Fase 2: Web Angular con SSR (Agosto 2026)

**Resultado:** ✅ app web con renderizado de servidor (SSR), SCSS, rutas y layout base. Se descartó SPA pura: sin SSR la web de producto pierde SEO, un requisito del negocio inmobiliario.

## Fase 3: API NestJS base (Agosto 2026)

**Resultado:** ✅ API con `main.ts` tipado (rawBody, CORS, ValidationPipe global) y módulo raíz. Se descartó agregar Swagger operativo en este punto (deuda menor: queda un log que referencia `/api/docs` sin la librería instalada).

## Fase 4: Autenticación Clerk completa (30/08/2026)

**Resultado:** ✅ `ClerkService` (verificación de tokens, sync de usuarios preparado), guards globales `ClerkAuthGuard` + `RolesGuard`, middleware `CompanyIdMiddleware` excluyendo el webhook, webhook Svix sobre cuerpo crudo, y 27 tests unitarios verdes.
**Lección:** verificar siempre el webhook con el formato real de la librería (Svix) sobre el payload crudo; el checkmark de un script no es la verificación.

## Fase 5: CI/CD (30/08/2026)

**Decisión:** [ADR-002](adr/ADR-002-despliegue-cicd.md) — GitHub Actions + Vercel + Render.
**Resultado:** ✅ workflows y blueprints creados y validados (YAML parsea, builds locales verdes). 🚧 Pendiente: resolver el `ERESOLVE` de `npm ci` (hallazgo P1) y conectar plataformas (secrets).
**Lección:** la CI descubre lo que el entorno local enmascara: lo que aquí funciona con warning, en un runner limpio aborta.

## Decisiones Descartadas

| Decisión descartada | Por qué se descartó |
|--------------------|--------------------|
| Next.js full-stack monolítico | Acopla web y API; typing compartido débil para el dominio (motor + RAG + agentes) |
| Microservicios (React/Vite + FastAPI + colas) | Mantenimiento multiplicado para equipo de 1 |
| SPA simple + BaaS (Supabase/Firebase) | Sin SSR; vendor lock-in; costes variables |
| Base de datos propia en la fase 1 | Sin consumidor real todavía: YAGNI, llega con el motor de viabilidad y el RAG |
| Docker en Render | Build command directo (`npm ci && nx build api`) es suficiente y más simple |
| `@svix/webhooks` (paquete scoped) | No accesible en el registro del entorno; `svix` oficial es el mismo mecanismo |
| Prettier plugin organizador de imports | Corrompió imports en autofix (rompió build): un formateador no debe invalidar código |
| PWA / app nativa | Sin demanda; web responsive cubre la fase actual |