# ADR-001: Stack del proyecto (monorepo Nx con Angular SSR + NestJS)

**Estado:** ✅ Implementado
**Fecha:** Agosto 2026
**Contexto:** decisión fundacional sobre la que se construyen el resto de fases. Proyecto SaaS multi-tenant de análisis de viabilidad inmobiliaria, equipo de 1 desarrollador, presupuesto ajustado, alcance creciente por fases.

---

## Contexto

El proyecto nace de una sesión de ideas (29/08/2026) y necesita un stack que permita: web pública con SSR (producto, SEO), API con auth multi-tenant, motor de cálculo determinista (tareas posteriores), RAG y agentes. Sin deuda heredada: todo por decidir.

Principio KES aplicado: 1.6 (IA es herramienta, no solución universal: el motor de viabilidad será algoritmo determinista, no IA) y YAGNI (kavana-tdd-kit).

## Problema

Con 1 desarrollador y costes contenidos, elegir el stack que no obligue a reescribir a medio plazo ni a mantener tres tecnologías distintas.

## Decisión

Monorepo **Nx 23** (npm workspaces) con dos aplicaciones TypeScript estricto:

- **Web**: Angular 22 con SSR (Angular Universal integrado), SCSS, `ngx-clerk` para auth en cliente.
- **API**: NestJS 11 (Express, webpack), auth Clerk (`@clerk/clerk-sdk-node`), verificación de webhooks con `svix`, guards globales (JWT + RBAC) y middleware de `company_id`.
- **Autenticación**: Clerk (managed auth: login, sesiones, RBAC por metadata y claims en el token).
- **Tests**: Jest (27 tests unitarios en la API), lint con ESLint flat config (TypeScript 6.0.3, typescript-eslint 8.6x).
- **Despliegue**: Vercel (web SSR) + Render (API) con GitHub Actions (detalle en ADR-002).

## Alternativas evaluadas

| Alternativa | Pro | Contra |
|-------------|-----|--------|
| **Monorepo Nx (Angular SSR + NestJS)** | Un solo lenguaje y toolchain; SSR de serie; estructura escalable a libs compartidas; comunidad grande | Dos deploys; tooling Nx con curva; Angular 22 exige TypeScript 6 (ajustes de compatibilidad, ver ADR-002) |
| Next.js full-stack monolítico | Un solo deploy; rápido de arrancar | Acopla web y API; typing compartido más débil para libs de dominio; migración costosa si el dominio crece (motor+RAG+agentes) |
| Microservicios (React/Vite + FastAPI + colas) | Independencia de servicios | Multiplicación de mantenimiento y deploys; killer para equipo de 1; sin necesidad real de escala horizontal |
| SPA simple + Backend as a Service (Supabase/Firebase) | Arranque rapidísimo, cero ops | Sin SSR; vendor lock-in; cálculo y RAG propietarios peor encajados; costes crecen con uso |

## Consecuencias

**Positivas:**
- Un solo lenguaje (TypeScript) en todo el repo, incluidos futuros libs (`viability-engine`, `rag`, `agents`).
- SSR de fábrica para la web comercial (SEO).
- Tests y lint integrados en Nx desde el inicio (27 tests verdes localmente).
- Clerk externaliza la seguridad de sesiones; la API solo verifica tokens y claims.

**Negativas / tradeoffs:**
- Dos objetivos de despliegue (Vercel + Render) en lugar de uno.
- TypeScript 6.0.3 (exigido por Angular 22) choca con el peer de `ts-jest@29.2.6` (`<6`): localmente avisa y funciona, pero `npm ci` en CI aborta (ERESOLVE). Hallazgo P1 pendiente con alternativas en ADR-002.
- Angular 22 requiere Node >= 22.22.3: los runners de CI y las plataformas deben usar Node 22, no 20.

## Dónde está

- `apps/api/` — API NestJS (auth en `apps/api/src/auth/`).
- `apps/web/` — web Angular SSR (rutas y guard en `apps/web/src/app/`).
- `package.json` / `nx.json` — monorepo Nx 23, npm workspaces.
- `tsconfig.base.json` — TypeScript 6.0.3 con `ignoreDeprecations` (deuda técnica: migrar `moduleResolution` en el futuro).