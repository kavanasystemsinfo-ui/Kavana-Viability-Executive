# Roadmap — Kavana Viability Executive

**Estado:** ✅ Tareas 1-6 implementadas y verificadas · 🚧 7 código listo pendiente de verificación en Atlas · ❌ 8-10 pendientes
**Última actualización:** 31/08/2026 (post-rebrand, ver ADR-005)
**Fuentes:** `docs/specs/`, `docs/adr/`, `docs/HISTORY.md`, `DECISIONS.md`

## Convenciones

- ✅ **Implementado + verificado** (tests en verde, evidencia citada).
- 🚧 **Código listo, verificación pendiente** (entorno real: Atlas, deploy, etc.).
- ❌ **Pendiente** (sin código, sin spec aprobada, o con spec pendiente de aprobación).
- Toda tarea pendiente de implementar requiere **spec aprobada por Jorge + ADR** antes de tocar código.

## Tareas

| # | Tarea | Estado | Evidencia / artefacto |
|---|---|---|---|
| 1 | Decisión de producto: SaaS multi-tenant de viabilidad inmobiliaria | ✅ | `docs/specs/producto.md` (30/08/2026) |
| 2 | Diseño de dominio: roles, jerarquía, multi-tenant por `company_id` | ✅ | ADR-001 |
| 3 | Stack: monorepo Nx 23, Angular 22 SSR + NestJS 11 + Clerk | ✅ | ADR-001, `package.json`, `nx.json` |
| 4 | Auth con Clerk (sync webhook, RBAC, middleware companyId) | ✅ | ADR-001, ADR-004, 27 tests auth (`apps/api/src/auth/`) |
| 5 | CI/CD (GitHub Actions → Vercel + Render) | ✅ | ADR-002, `.github/workflows/`, `vercel.json`, `render.yaml` |
| 6 | Motor de viabilidad TypeScript puro con TDD | ✅ | ADR-003, `libs/viability-engine`, 24 tests |
| 7 | Persistencia MongoDB (Atlas) + endpoints de lectura | 🚧 | ADR-004, `apps/api/src/seed`, 14 tests persistencia; pendiente verificar contra Atlas real (URI no proporcionada aún) |
| 8 | RAG Pipeline (ingesta → embeddings → Atlas Vector Search) | ❌ | Spec pendiente |
| 9 | Orquestador Executive + agentes PoC (CSO + CFO) con streaming | ❌ | Spec pendiente. **NO es frontend** (error de la sesión del 30/08 corregido) |
| 10 | Dashboard Angular (promociones, KPIs, chat widget) | ❌ | Spec pendiente |

## Dependencias

```
1 → 2 → 3 → 4 → 5
            └→ 6 → 7 → 8 → 9 → 10
```

- La 6 necesitaba la 3 (Nx) y la 1 (dominio claro).
- La 7 necesitaba la 6 (motor con datos que persistir) y la 4 (auth para multi-tenant).
- La 8 necesita la 7 (BD con datos y embeddings).
- La 9 necesita la 8 (RAG como herramienta del orquestador).
- La 10 necesita la 7 (datos para KPIs) y se puede solapar con la 8/9 para iterar UX.

## Siguiente paso

1. **Verificación de la tarea 7 en Atlas** (bloque 2 del rebrand): requiere URI de MongoDB Atlas de Jorge. Cambia `companyId: 'kavana-apartaments'` → `kavana_viability_executive` en `db.promotions` y `db.knowledge_chunks` con la migración in-place aprobada en ADR-005.
2. **Spec de la tarea 8 (RAG)**: pendiente de briefing de Jorge. No se empieza sin spec.
3. **Spec de la tarea 10 (Dashboard)**: pendiente de briefing de Jorge. No se empieza sin spec.

## Nota sobre la errata del 30/08/2026

En la sesión del 30/08 a las 4:39 PM, en un mensaje al retomar la tarea 4, escribí que "quedaban pendientes la 5 a la 9" y situé el **Dashboard Angular en la tarea 9**. Esto fue incorrecto: la 9 es el **orquestador + agentes**, no el frontend. El dashboard es la **tarea 10**. La fuente de verdad actual son `docs/specs/producto.md` y este roadmap; los resúmenes antiguos deben interpretarse a la luz de esta corrección.
