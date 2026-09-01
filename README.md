# Kavana Viability Executive

![Angular](https://img.shields.io/badge/Angular-22.0-red)
![NestJS](https://img.shields.io/badge/NestJS-11-e0234e)
![Nx](https://img.shields.io/badge/Nx-23-143055)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6c47ff)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47a248)
![Tests](https://img.shields.io/badge/Tests-66-2ea44f)
![License](https://img.shields.io/badge/License-MIT-blue)

## ⚡ 30 Segundos

**Problema:** los equipos de promoción inmobiliaria evalúan la viabilidad de cada promoción con hojas de cálculo dispersas y criterios que cambian según la persona. No hay una fuente única que diga si una oportunidad justifica el riesgo y con qué supuestos.

**Solución:** un SaaS multi-tenant de análisis de viabilidad inmobiliaria. Por fases: motor de cálculo determinista con tests, persistencia MongoDB con seed desde fixtures, RAG sobre documentación corporativa, orquestador con agentes especializados y dashboard. Hoy: monorepo con autenticación completa, motor verificado y pipeline de despliegue.

**Stack:** Nx 23 · Angular 22 SSR · NestJS 11 · Mongoose · Clerk · TypeScript 6 · Jest · Vercel + Render + GH Actions.

_Transparencia: proyecto en desarrollo, sin clientes reales._

## 🏗️ Arquitectura

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Web (Angular│     │  API (NestJS 11) │     │  Clerk (managed)    │
│  SSR + Clerk │ ──► │  guards globales │ ──► │  tokens + webhooks  │
│  /login      │     │  RBAC jerarquía  │     │  (svix, raw body)   │
│  /dashboard  │     │  company_id      │     └─────────────────────┘
└─────────────┘     └────────┬─────────┘
                             │  hecho: viability-engine · MongoDB (Atlas)
                             │  pendiente: RAG (Atlas Vector) · agents · dashboard
                     Deploy: Vercel (web) · Render (API) · GH Actions (CI)
```

## 🧠 Decisiones clave

| Decisión | Alternativas | Elegida | Por qué |
| --- | --- | --- | --- |
| Stack | Next.js fullstack · microservicios · BaaS | **Monorepo Nx (Angular SSR + NestJS)** | 1 lenguaje, SSR de serie, escalable a libs de dominio ([ADR-001](docs/adr/ADR-001-stack.md)) |
| Despliegue | Todo Vercel · Fly.io · manual | **GH Actions + Vercel + Render** | Gratis, cada plataforma especialista, deploy automático ([ADR-002](docs/adr/ADR-002-despliegue-cicd.md)) |
| Motor de cálculo | Módulo NestJS · utils en apps/web | **Lib Nx TypeScript pura, funciones puras** | Testeable al 100% sin mocks; compartible por web/API/agentes ([ADR-003](docs/adr/ADR-003-viability-engine.md)) |
| Persistencia | SQL/Postgres · seed mongosh legacy | **MongoDB + Mongoose + seed desde fixtures** | Tooling Atlas previo; esquemas flexibles para los fixtures; seed idempotente ([ADR-004](docs/adr/ADR-004-persistencia-mongodb.md)) |
| Diagnóstico de auth | Reset a ciegas · cambiar de cluster | **Diagnóstico diferencial antes de tocar credenciales** | Cero cambios destructivos; causa raíz identificada con evidencia ([ADR-006](docs/adr/ADR-006-mongodb-atlas-bad-auth.md)) |

## 📊 Estado

- ✅ **Implementado y verificado:** monorepo Nx, auth Clerk completa (RBAC por jerarquía, middleware `company_id`, webhook Svix con cuerpo crudo), motor de viabilidad (24 tests, fixture La Marina reproducible a mano), persistencia MongoDB (13 tests de mapper + service + controller), 66 tests unitarios verdes localmente, suite en verde con `nx run-many -t test lint build --all`, web desplegada en Vercel (HTTP 200).
- 🚧 **En progreso:** API en Render pendiente del `RENDER_DEPLOY_HOOK_URL` (manual de Jorge), `CLERK_PUBLISHABLE_KEY` dinámica en la web (deuda menor).
- ⚠️ **Transparencia:** sin clientes reales; las cifras de negocio del fixture son del modelo demo, no de promotoras reales; claims de rol y empresa pendientes de inyectar en el token de sesión desde el dashboard de Clerk.

## 📚 Documentación

- [Spec de producto](docs/specs/producto.md) · [Spec del motor](docs/specs/viability-engine.md)
- [Decisiones (DECISIONS.md)](DECISIONS.md) — índice cronológico de los 7 ADRs
- [Historia del proyecto](docs/HISTORY.md) — fases y decisiones descartadas
- [Métricas de tests](docs/METRICS.md) — qué cubren los 66 tests, no solo cuántos
- [Roadmap](docs/ROADMAP.md) — 10 tareas con estados, dependencias y errata corregida

## 🚀 Cómo ejecutar

```bash
npm ci                          # instalación limpia
npx nx serve api                # API en http://localhost:3000/api
npx nx serve web                # web en http://localhost:4200
npx nx test api                 # 42 tests unitarios (API)
npx nx run-many -t test lint build --all   # verificación completa
```

Requiere `apps/api/.env` con `MONGODB_URI`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` y `CLERK_WEBHOOK_SIGNING_SECRET` (ver `apps/api/.env.example`).

---

_Proyecto diseñado con criterio arquitectónico propio, implementado con asistencia de IA._
_Parte del ecosistema [Kavana Systems](https://github.com/kavanasystemsinfo-ui)._