# Kavana Viability Executive

![Angular](https://img.shields.io/badge/Angular-22.0-red)
![NestJS](https://img.shields.io/badge/NestJS-11-e0234e)
![Nx](https://img.shields.io/badge/Nx-23-143055)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6c47ff)
![Tests](https://img.shields.io/badge/Tests-64-2ea44f)
![License](https://img.shields.io/badge/License-MIT-blue)

## ⚡ 30 Segundos

**Problema:** los equipos de promoción inmobiliaria evalúan la viabilidad de cada promoción con hojas de cálculo dispersas y criterios que cambian según la persona. No hay una fuente única que diga si una oportunidad justifica el riesgo y con qué supuestos.

**Solución:** un SaaS multi-tenant de análisis de viabilidad inmobiliaria. Por fases: motor de cálculo determinista con tests, RAG sobre documentación corporativa, orquestador con agentes especializados y dashboard. Hoy: monorepo con autenticación completa y pipeline de despliegue.

**Stack:** Nx 23 · Angular 22 SSR · NestJS 11 · Clerk · TypeScript 6 · Jest · Vercel + Render.

_Transparencia: proyecto en desarrollo, sin clientes reales._

## 🏗️ Arquitectura

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Web (Angular│     │  API (NestJS 11) │     │  Clerk (managed)    │
│  SSR + Clerk │ ──► │  guards globales │ ──► │  tokens + webhooks  │
│  /login      │     │  RBAC jerarquía  │     │  (svix, raw body)   │
│  /dashboard  │     │  company_id      │     └─────────────────────┘
└─────────────┘     └────────┬─────────┘
                             │  hecho: viability-engine · MongoDB · futuro: RAG (Atlas) · agents · dashboard
                     Deploy: Vercel (web) · Render (API) · GH Actions (CI)
```

## 🧠 Decisiones clave

| Decisión              | Alternativas                              | Elegida                                | Por qué                                                                                                                 |
| --------------------- | ----------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Stack                 | Next.js fullstack · microservicios · BaaS | **Monorepo Nx (Angular SSR + NestJS)** | 1 lenguaje, SSR de serie, escalable a libs de dominio (ADR-001)                                                         |
| Despliegue            | Todo Vercel · Fly.io · manual             | **GH Actions + Vercel + Render**       | Gratis, cada plataforma especialista, deploy automático (ADR-002)                                                       |
| Persistencia usuarios | Mongo temprano · Clerk-only               | **Clerk como fuente de verdad**        | YAGNI al inicio: la BD propia llega con el motor (tarea 7, promociones); los usuarios siguen en Clerk (ADR-001/ADR-004) |
| Multi-tenant          | Organizaciones Clerk · claim en token     | **claim `company_id` en el JWT**       | Simple, suficiente para el dominio actual (ADR-001)                                                                     |

## 📊 Estado

- ✅ **Implementado:** monorepo Nx, auth Clerk completa (RBAC por jerarquía, middleware `company_id`, webhook Svix), motor de viabilidad (tarea 6), persistencia MongoDB (tarea 7: `GET /promotions` y `GET /promotions/:id/viability`), 64 tests unitarios verdes localmente (24 motor + 40 API), pipelines de despliegue preparados, CI con `npm ci` resuelto (ts-jest 29.4.12).
- 🚧 **En progreso:** deploys sin conectar (faltan secrets VERCEL\_\* y RENDER_DEPLOY_HOOK_URL), URI de MongoDB Atlas pendiente para la verificación final de la tarea 7, `CLERK_PUBLISHABLE_KEY` dinámica en la web.
- ⚠️ **Transparencia:** sin clientes reales; claims de rol y empresa pendientes de inyectar en el token de sesión desde el dashboard de Clerk.

## 📚 Documentación

- [Spec de producto](docs/specs/producto.md)
- [Decisiones (DECISIONS.md)](DECISIONS.md)
- [ADR-001: Stack](docs/adr/ADR-001-stack.md)
- [ADR-002: Despliegue y CI/CD](docs/adr/ADR-002-despliegue-cicd.md)
- [Historia del proyecto](docs/HISTORY.md)
- [Métricas de tests](docs/METRICS.md)
- [Guía operativa de CI/CD](.github/README-ci.md)

## 🚀 Cómo ejecutar

```bash
npm ci                    # o npm ci --legacy-peer-deps hasta resolver ADR-002
npx nx serve api          # API en http://localhost:3000/api
npx nx serve web          # web en http://localhost:4200
npx nx test api           # 40 tests unitarios (API); 64 en total con el motor
npx nx build api && npx nx build web   # bundles de producción
```

Requiere `apps/api/.env.local` con las claves de Clerk (ver `apps/api/.env.example`).

---

_Proyecto diseñado con criterio arquitectónico propio, implementado con asistencia de IA._
_Parte del ecosistema [Kavana Systems](https://github.com/kavanasystemsinfo-ui)._
