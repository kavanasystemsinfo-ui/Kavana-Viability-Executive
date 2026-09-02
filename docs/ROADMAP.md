# Roadmap — Kavana Viability Executive

**Estado:** ✅ Tareas 1-7 implementadas y verificadas · ❌ 8-10 pendientes (sin spec aprobada)
**Última actualización:** 31/08/2026 (post-rebrand, ver ADR-005)
**Fuentes:** `docs/specs/`, `docs/adr/`, `docs/HISTORY.md`, `DECISIONS.md`

## Convenciones

- ✅ **Implementado y verificado** (tests en verde, evidencia citada; verificado contra Atlas real para la tarea 7 tras la saga del ADR-006).
- 🚧 **Código listo, verificación pendiente** (entorno real: Atlas, deploy, etc.).
- ❌ **Pendiente** (sin código, sin spec aprobada, o con spec pendiente de aprobación).
- Toda tarea pendiente de implementar requiere **spec aprobada por Jorge + ADR** antes de tocar código.

## Tareas

| # | Tarea | Estado | Evidencia / artefacto |
|---|---|---|---|
| 1 | Decisión de producto: SaaS multi-tenant de viabilidad inmobiliaria | ✅ | [Spec](docs/specs/producto.md) (30/08/2026) |
| 2 | Diseño de dominio: roles, jerarquía, multi-tenant por `company_id` | ✅ | [ADR-001](docs/adr/ADR-001-stack.md) |
| 3 | Stack: monorepo Nx 23, Angular 22 SSR + NestJS 11 + Clerk | ✅ | [ADR-001](docs/adr/ADR-001-stack.md), `package.json`, `nx.json` |
| 4 | Auth con Clerk (sync webhook, RBAC, middleware companyId) | ✅ | [ADR-001](docs/adr/ADR-001-stack.md), 27 tests auth (`apps/api/src/auth/`) |
| 5 | CI/CD (GitHub Actions → Vercel + Render) | ✅ | [ADR-002](docs/adr/ADR-002-despliegue-cicd.md), `.github/workflows/`, `vercel.json`, `render.yaml` |
| 6 | Motor de viabilidad TypeScript puro con TDD | ✅ | [ADR-003](docs/adr/ADR-003-viability-engine.md), `libs/viability-engine`, 24 tests |
| 7 | Persistencia MongoDB (Atlas) + endpoints de lectura | ✅ | [ADR-004](docs/adr/ADR-004-persistencia-mongodb.md), [ADR-006](docs/adr/ADR-006-mongodb-atlas-bad-auth.md), `apps/api/src/seed`, 13 tests persistencia; verificado contra Atlas real el 31/08/2026 |
| 8 | RAG Pipeline (ingesta → embeddings → Atlas Vector Search) | ❌ | Spec pendiente (bloqueada por compromiso de proceso del 31/08/2026) |
| 9 | Orquestador Executive + agentes PoC (CSO + CFO) con streaming | ❌ | Spec pendiente (bloqueada por compromiso de proceso del 31/08/2026). **NO es frontend** (errata del 30/08 corregida) |
| 10 | Dashboard Angular (promociones, KPIs, chat widget) | 🚧 | Spec ✅ (`docs/specs/dashboard.md`, 02/09/2026) + ADR-008 ✅ (`docs/adr/ADR-008-dashboard-angular.md`). Mockup visual aprobado por Jorge 02/09/2026 (sidebar navy #0F2A4A confirmado). Fase 1 (estructura, design system, ApiService, RBAC, MockChatService, server routes) en implementación vía coding agent; vistas finales en fase 2 tras OK. |

## Dependencias

```
1 → 2 → 3 → 4 → 5
            └→ 6 → 7 → 8 → 9 → 10
```

- La 6 necesitaba la 3 (Nx) y la 1 (dominio claro).
- La 7 necesitaba la 6 (motor con datos que persistir) y la 4 (auth para multi-tenant). Verificada contra BD real tras la saga del ADR-006.
- La 8 necesita la 7 (BD con datos y embeddings).
- La 9 necesita la 8 (RAG como herramienta del orquestador).
- La 10 necesita la 7 (datos para KPIs) y se puede solapar con la 8/9 para iterar UX.

## Siguiente paso

1. **Bloque 2 del rebrand** (URI de Atlas y `RENDER_DEPLOY_HOOK_URL` ya disponibles; pendiente solo el push de los secretos cuando Jorge los confirme). Cuando se ejecute, verificar que `GET /api/promotions` con token real lista las 6 promociones con `companyId: "kavana_viability_executive"`.
2. **Spec de la tarea 8 (RAG)**: pendiente de briefing de Jorge. No se empieza sin spec.
3. **Spec de la tarea 9 (orquestador + agentes)**: pendiente de briefing de Jorge. No se empieza sin spec.
4. **Spec de la tarea 10 (Dashboard)**: pendiente de briefing de Jorge. No se empieza sin spec.

## Compromiso de proceso (31/08/2026)

Las tareas 8, 9 y 10 no se inician sin briefing aprobado por Jorge. Si una tarea de esas aparece sin OK escrito, considéralo un bug. Fuente: sesión del 31/08/2026 (KB del perfil) y directiva de calidad (ADR-007).

## Nota sobre la errata del 30/08/2026

En la sesión del 30/08 a las 4:39 PM, en un mensaje al retomar la tarea 4, escribí que "quedaban pendientes la 5 a la 9" y situé el **Dashboard Angular en la tarea 9**. Esto fue incorrecto: la 9 es el **orquestador + agentes**, no el frontend. El dashboard es la **tarea 10**. La fuente de verdad actual son `docs/specs/producto.md` y este roadmap; los resúmenes antiguos deben interpretarse a la luz de esta corrección. La errata queda registrada en este roadmap como nota histórica; los ADRs (001 a 004) no se renombran para preservar la narrativa del momento en que se tomó cada decisión.