# Spec de producto: Kavana Viability Executive

**Estado:** 🚧 En desarrollo (sin clientes reales)
**Fecha:** 30/08/2026 · **Actualizado:** 31/08/2026
**Fuente:** decisión de Jorge del 29/08/2026 (sesión de ideas de negocio inmobiliario)

## Problema

Los equipos de promoción inmobiliaria evalúan la viabilidad de una promoción (compra de suelo, construcción, venta) con hojas de cálculo dispersas y criterios que cambian de una persona a otra. No hay una fuente única que responda, ante una oportunidad concreta, si el margen esperado justifica el riesgo y con qué supuestos.

## Solución

Un SaaS multi-tenant de análisis de viabilidad inmobiliaria donde cada empresa (promotora) gestiona sus promociones con:

1. **Motor de viabilidad**: cálculo de viabilidad con supuestos declarados y tests que garantizan los resultados (tarea 6).
2. **Persistencia MongoDB**: base de datos propia con promociones y runs de viabilidad, seed desde fixtures y endpoints de lectura (tarea 7).
3. **RAG sobre documentación corporativa**: respuestas citadas sobre normativa, criterios y escenarios propios (tarea 8).
4. **Orquestador ejecutivo**: agentes especializados (CSO, CFO) que producen informes y recomendaciones (tarea 9).
5. **Dashboard**: promociones, KPIs y chat (tarea 10).

## Alcance actual (fases 1 a 5, completadas)

- Monorepo Nx con dos aplicaciones: web (Angular 22 SSR) y api (NestJS 11).
- Autenticación con Clerk: login, RBAC por jerarquía de roles, multi-tenant por `company_id`, webhooks verificados con Svix.
- CI/CD configurado: GitHub Actions (lint, test, build), despliegue a Vercel (web) y Render (API).
- Persistencia: Clerk como fuente de verdad de usuarios; base de datos propia MongoDB (tarea 7) con seed desde fixtures y endpoints GET /promotions y GET /promotions/:id/viability.

## Fuera de alcance (YAGNI en esta fase)

- RAG, orquestador y dashboard (tareas 8 a 10, por orden).
- Gestión de organizaciones compleja en Clerk, invitaciones masivas, white-label.
- Autenticación alternativa (SSO corporativo, magic links) hasta que haya demanda real.

## Supuestos a validar

- El rol multi-tenant se distribuye con claims en el token de sesión de Clerk (paso manual pendiente en el dashboard).
- La inyección de `CLERK_PUBLISHABLE_KEY` en el bundle Angular aún no es dinámica (se fija en `apps/web/src/environments/environment.ts`).
- Sin clientes reales: ninguna cifra de negocio verificada; todo lo anterior son decisiones de producto en desarrollo.