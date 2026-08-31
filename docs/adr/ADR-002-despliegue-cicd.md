# ADR-002: Despliegue y CI/CD (GitHub Actions + Vercel + Render)

**Estado:** ✅ Implementado (deploys pendientes de conectar secrets)
**Fecha:** Agosto 2026
**Contexto:** entregar el producto con 1 desarrollador y coste mínimo: automatizar calidad (lint, tests, build) y despliegue (web SSR y API) sin operar infraestructura propia.

---

## Contexto

Tras el ADR-001 (stack Nx), hay dos artefactos que publicar: web Angular SSR y API NestJS. No hay presupuesto de infraestructura propia; se buscan plataformas managed con plan gratuito razonable de arranque.

## Problema

Configurar un pipeline que en cada push a `master` verifique calidad y despliegue ambos servicios, con secretos gestionados por plataforma (sin volcar claves de Clerk en el repo).

## Decisión

- **CI**: GitHub Actions con un workflow `ci.yml` (Node 22.x, `npm ci`, `nx run-many -t lint test build`) en PRs y push a `master`. Gate de despliegue: branch protection exigiendo el check `ci`.
- **Web → Vercel**: workflow con el patrón oficial `vercel pull` + `vercel build` + `vercel deploy --prebuilt`, usando los secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. `vercel.json` declara el framework Angular y el output SSR (`dist/apps/web/browser`).
- **API → Render**: Blueprint `render.yaml` (servicio web `kavana-viability-executive-api`, build `npm ci && nx build api`, start `node dist/apps/api/main.js`, plan free) y un workflow que dispara el deploy hook (`RENDER_DEPLOY_HOOK_URL`) en cada push a `master`.
- **Secretos**: viven en las plataformas (Vercel env vars, Render env vars) o como secrets del repo (`VERCEL_*`, `RENDER_DEPLOY_HOOK_URL`). Nunca en el repo.

## Alternativas evaluadas

| Alternativa | Pro | Contra |
|-------------|-----|--------|
| **GitHub Actions + Vercel (web) + Render (API)** | Gratis de arranque; cada plataforma especialista en su tipo (SSR / API long-running); deploy hooks simples | Dos paneles que vigilar; Render free se duerme a los 15 min (los webhooks de Clerk reintentan) |
| Todo en Vercel (API como serverless functions) | Un solo panel | NestJS con webhooks y raw body en serverless requiere adaptaciones; costes por invocación; menos control |
| Fly.io (todo) | Uso de contenedores, control completo | Operación más manual; configuración mayor para 1 dev |
| Sin CI, deploy manual por CLI | Cero configuración | Sin gate de calidad; sin historial; riesgo alto de romper producción |

## Consecuencias

**Positivas:**
- Calidad garantizada antes de desplegar (el CI bloquea).
- Despliegue automático: push a `master` = release.
- Coste: plan free en ambas plataformas para arrancar.

**Negativas / tradeoffs:**
- **Hallazgo P1 (CI rojo en el primer push, 30/08/2026)**: `npm ci` aborta con `ERESOLVE` porque `ts-jest@29.2.6` declara peer `typescript >=4.3 <6` y el proyecto usa TypeScript 6.0.3 (exigido por Angular 22). En local funciona con warning porque el lockfile se resolvió en el entorno del VPS. Alternativas pendientes de decisión:
  1. Añadir `.npmrc` con `legacy-peer-deps=true` (rápido, pero acepta resoluciones potencialmente rotas).
  2. Subir `ts-jest` a una versión compatible con TypeScript 6 (limpieza real, requiere re-testear la suite).
  Recomendación: opción 2 si existe release compatible; si no, 1 como puente documentado.

**Nota de resolución (30/08/2026):** se ejecutó la opción 2. `ts-jest` subido de 29.2.6 a **29.4.12** (verificado en el registro npm: peer `typescript >=4.3 <7`). La suite (27/27 tests) y los builds de api y web pasan en local con TypeScript 6.0.3. La opción `.npmrc` quedó descartada como innecesaria.
- Render free se duerme a los 15 minutos sin tráfico (primer request lento tras dormir; no se pierden webhooks, Clerk reintenta).
- La `CLERK_PUBLISHABLE_KEY` de la web se fija en build (environment estático): para producción dinámica hay que inyectarla en el bundle (pendiente).
- Los workflows se disparan sobre `master`: si algún día se renombra a `main`, hay que actualizar los `on:`.

## Dónde está

- `.github/workflows/ci.yml` — CI (lint, test, build).
- `.github/workflows/deploy-web.yml` — despliegue a Vercel.
- `.github/workflows/deploy-api.yml` — deploy hook de Render.
- `vercel.json` — framework Angular y output.
- `render.yaml` — Blueprint del servicio API.
- `.github/README-ci.md` — pasos operativos para conectar las plataformas.