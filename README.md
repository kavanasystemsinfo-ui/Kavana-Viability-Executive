# Kavana Viability Executive

![Angular](https://img.shields.io/badge/Angular-22.0-red)
![NestJS](https://img.shields.io/badge/NestJS-11-e0234e)
![Nx](https://img.shields.io/badge/Nx-23-143055)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6c47ff)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47a248)
![Tests](https://img.shields.io/badge/Tests-66-2ea44f)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🎯 Qué es KVE y por qué existe (como pieza de portafolio)

**Kavana Viability Executive (KVE)** es un **MVP DEMO/PORTFOLIO** creado para demostrar mi capacidad de construir software a medida gestionado con IA y mi habilidad de análisis de negocio en dominios desconocidos. **NO es un producto para cliente real**, sino un ejemplo de cómo abordar el desarrollo de software cuando no se conoce el dominio de partida.

Este proyecto muestra:
- Arquitectura técnica sólida con monorepo Nx, Angular SSR y NestJS
- Motor de viabilidad inmobiliario implementado con TDD estricto
- Integración completa de autenticación (Clerk) y persistencia (MongoDB Atlas)
- Proceso de desarrollo guiado por IA (orquestador Elías + subagentes especializados)
- Documentación arquitectónica completa (8 ADRs)
- Honestidad intelectual sobre limitaciones y suposicios

---

## 🏗️ Problema hipotético que KVE intenta resolver

**Contexto ficticio basado en entrevistas preliminares:** Los equipos de promoción inmobiliaria evalúan la viabilidad de cada promoción con hojas de cálculo dispersas y criterios que cambian según la persona que las elabora. No existe una fuente única que responda de forma consistente si una oportunidad justifica el riesgo y con qué supuestos.

**Problema hipotético:** Falta de estandarización y trazabilidad en los cálculos de viabilidad inmobiliaria, lo que lleva a decisiones inconsistentes y dificulta la comparación objetiva entre promociones.

**Nota importante:** Este es un escenario de demostración. No tengo experiencia directa en el sector inmobiliario y los datos utilizados provienen de fixtures creados para el ejercicio, no de promotoras reales.

---

## 🔧 Stack y arquitectura

KVE está construido como un monorepo Nx moderno con separación clara de responsabilidades:

**Arquitectura general:**
```mermaid
graph LR
    A[Web App Angular SSR] -->|HTTP| B[API NestJS]
    B -->|Driver| C[(MongoDB Atlas)]
    B -->|Webhooks| D[Clerk (Auth Managed)]
    B -->|Llama a| E[Viability Engine Lib]
    E -->|Funciones puras| F[Cálculos deterministas]
```

**Tecnologías clave:**
- **Frontend:** Angular 22 con Server-Side Rendering (SSR)
- **Backend:** NestJS 11 (arquitectura modular, TypeScript estricto)
- **Fullstack:** Nx 23 (monorepo con compartición de tipos y libs)
- **Auth:** Clerk (autenticación gestionada, RBAC por jerarquía, multi-tenant)
- **Base de datos:** MongoDB Atlas + Mongoose
- **Testing:** Jest (66 tests unitarios con cobertura significativa)
- **Despliegue:** Vercel (frontend) + Render (backend) + GitHub Actions (CI/CD)

**Enlaces a decisiones arquitectónicas (ADRs):**
- [ADR-001: Stack - Monorepo Nx (Angular SSR + NestJS)](docs/adr/ADR-001-stack.md)
- [ADR-002: Despliegue y CI/CD (GH Actions + Vercel + Render)](docs/adr/ADR-002-despliegue-cicd.md)
- [ADR-003: Motor de viabilidad como librería Nx TypeScript pura](docs/adr/ADR-003-viability-engine.md)
- [ADR-004: Persistencia MongoDB (Mongoose)](docs/adr/ADR-004-persistencia-mongodb.md)
- [ADR-005: Rebrand a Kavana Viability Executive](docs/adr/ADR-005-rebrand-kavana-viability-executive.md)
- [ADR-006: Diagnóstico MongoDB Atlas bad auth](docs/adr/ADR-006-mongodb-atlas-bad-auth.md)
- [ADR-007: Directiva de calidad de reporting y modelo de relación equipo-cliente](docs/adr/ADR-007-directiva-calidad-y-modelo-relacion.md)
- [ADR-008: Dashboard Angular (stack visual, datos, RBAC, chat)](docs/adr/ADR-008-dashboard-angular.md)

---

## 🤖 Cómo se construyó — proceso con IA

Este proyecto siguió una metodología de desarrollo asistida por IA rigurosa:

1. **Orquestación principal:** Elías (orquestador Hermes) definió la arquitectura general, tomó decisiones técnicas y supervisó la calidad.
2. **Especialización de subagentes:**
   - `$dev`: Implementación de funcionalidades (API, web, motor de viabilidad)
   - `$doc`: Creación y mantenimiento de documentación técnica (specs, ADRs)
   - `$ideas`: Brainstorming de enfoques y validación de supuestos
3. **Validación humana continua:** Jorge (el usuario) proporcionó feedback en cada fase clave:
   - Aprobación del stack inicial
   - Validación del motor de viabilidad y sus umbrales
   - Revisiones de arquitectura y decisiones de diseño
   - Verificación de tests y calidad del código
4. **Flujo de trabajo:**
   - Brainstorming inicial con `$ideas` para definir alcance y enfoque
   - Diseño arquitectónico y creación de ADRs preliminares
   - Desarrollo incremental TDD con `$dev` (motor primero, luego API, luego web)
   - Documentación paralela con `$doc` (specs, ADRs, métricas)
   - Integración y pruebas end-to-end
   - Despliegue en staging y producción (Vercel/Render)

Este enfoque permitió construir una base técnica sólida en tiempo limitado, aprovechando la IA para tareas rutinarias y enfocando el esfuerzo humano en decisiones arquitectónicas y validación de negocio.

---

## 📓 Log de aprendizajes

Durante la construcción de KVE, estos fueron aprendizajes concretos y específicos:

1. **NestJS modularidad:** Aprendí a estructurar módulos de NestJS con clara separación de responsabilidades (controllers, services, guards) y cómo usar `@nestjs/mongoose` para integración limpia con MongoDB sin acoplar la lógica de dominio a la ORM.

2. **Clerk y multi-tenencia:** Descubrí que la gestión de claims y roles en Clerk requiere configuración explícita en el dashboard para inyectar `company_id` en los tokens de sesión - un paso que inicialmente pasé por alto causando problemas de autenticación que requirieron diagnóstico diferencial (ver ADR-006).

3. **Nx y compartición de código:** La creación de libs Nx puras (como `viability-engine`) permite compartir tipos y lógica entre aplicaciones web y API sin duplicación, pero requiere atención especial a los límites de publicación y versionado dentro del monorepo.

4. **Análisis sin dominio:** Trabajar en inmobiliaria sin experiencia previa reforzó la importancia de:
   - Separar claramente lo que es código determinista (motor) de lo que es configuración de negocio (umbrales, fixtures)
   - Hacer explícitos todos los supuestos mediante documentación y warnings
   - Validar constantemente con el experto de dominio (Jorge) en lugar de asumir

5. **TDD puro en librerías:** Implementar el motor de viabilidad con TDD estricto (RED-GREEN-REFACTOR) sobre funciones puras sin I/O ni dependencias externas resultó extremadamente liberador - permitió refactorizar con confianza total y lograr 24 tests que cubren todos los casos edge sin necesidad de mocks.

---

## 🎨 Decisiones de diseño clave

Las decisiones arquitectónicas más importantes están documentadas en los 8 ADRs del proyecto. Cada una representa un trade-off considerado cuidadosamente:

1. **Stack tecnológico (ADR-001):** Elegí monorepo Nx con Angular SSR + NestJS sobre alternativas como Next.js fullstack o microservicios por: un solo lenguaje (TypeScript), SSR de serie en Angular, y escalabilidad futura mediante libs de dominio compartidas.

2. **Estrategia de despliegue (ADR-002):** Seleccioné GitHub Actions + Vercel + Render por: gratuito en tiers iniciales, cada plataforma especializada en su dominio (frontend/static vs backend), y deploy automático mediante hooks.

3. **Motor de viabilidad (ADR-003):** Opté por librería Nx TypeScript pura con funciones deterministas sobre módulo NestJS o utils en apps/web para lograr: testabilidad al 100% sin mocks, reutilización por web/API/agentes futuros, y aislado de preocupaciones de infraestructura.

4. **Persistencia de datos (ADR-004):** Elegí MongoDB + Mongoose + seed desde fixtures sobre SQL/Postgres por: familiaridad previa con tooling Atlas, esquemas flexibles para manejar variaciones en fixtures, y seed idempotente para desarrollo consistente.

5. **Diagnóstico de auth (ADR-006):** Implementé diagnóstico diferencial antes de tocar credenciales tras episodios de `bad auth` con MongoDB Atlas, aprendiendo que: resetar a ciegas es destructivo, y evidenciar la causa raíz con pruebas controladas previene ciclos de solución ineficaces.

6. **Directiva de calidad (ADR-007):** Establecí reporting obligatorio en tres estados (IMPLEMENTADO/VERIFICADO/DESPLEGADO) con evidencia citada y read-back del destino real para asegurar trazabilidad y evitar afirmaciones no verificables.

7. **Modelo de relación (ADR-007):** Definí claramente que Jorge define el qué (producto/negocio) mientras Elías decide el cómo (arquitectura/implementación), escalando solo en decisiones de producto u operaciones irreversibles.

8. **Dashboard Angular (ADR-008):** Planeé el dashboard con stack visual (Angular Material), datos fuertes tipados, RBAC heredado de API, chat básico y server routes para futuro - reconociendo que esta fase estaba aprobada pero en implementación al cerrar el MVP demo.

---

## ⚠️ Limitaciones intencionales

Como demo de portafolio, dejé deliberadamente ciertos aspectos simples o incompleto para enfocar esfuerzo en demostrar las capacidades clave:

**Webhook de Clerk:** 
- **Qué dejé simple:** El webhook Svix con cuerpo crudo está implementado pero requiere manualmente configurar `CLERK_WEBHOOK_SIGNING_SECRET` en el entorno de Render.
- **Por qué:** Para una demo de portafolio, enfocarme en demostrar que entiendo el flujo de webhooks y puedo implementar la verificación era más valioso que automatizar completamente el despliegue en Render (que requiere intervención manual de Jorge para proporcionar el hook URL).

**Tests e2e scaffold:**
- **Qué dejé simple:** La aplicación `api-e2e` existe con estructura de Jest pero sin tests e2e reales escritos (solo placeholder).
- **Por qué:** Los 66 tests unitarios verdes demuestran suficientemente la solidez técnica del motor y la API. Para un portafolio, mostrar profundidad en testing unitario/TDD era más relevante que ampliar a e2e sin agregar valor demostrativo distinto.

**Sin rate limiting:**
- **Qué dejé simple:** No implementé rate limiting en los endpoints de la API.
- **Por qué:** En un contexto de demo sin tráfico real y con autenticación Clerk gestionada, el rate limiting agregaría complejidad operativa sin demostrar habilidades adicionales relevantes para el portafolio. La autenticación y autorización ya están demostradas vía Clerk guards y middleware `company_id`.

**Outras simplificaciones intencionales:**
- RAG sobre documentación corporativa (tarea 8 del spec) no implementado - enfocarme en demostrar el motor determinista primero era más valioso para mostrar habilidades de análisis puro.
- Orquestador ejecutivo y agentes especializados (tarea 9) no implementados - el enfoque estuvo en demostrar que puedo construir la base técnica sobre la cual esos agentes podrían construirse.
- Gestión compleja de organizaciones en Clerk (invitaciones masivas, white-label) no abordada - suficiente demostrar multi-tenencia básica vía `company_id`.

Estas limitaciones son conscientes y justificadas por el objetivo del proyecto como pieza de portafolio: demostrar capacidades específicas de construcción de software gestionado con IA y análisis de negocio, no construir un producto listo para mercado.

---

## 🚀 Cómo ejecutarlo localmente

Requisitos: Node.js 20.x, npm o pnpm, acceso a MongoDB Atlas y Clerk (variables de entorno necesarias).

```bash
# 1. Instalar dependencias (limpia)
npm ci

# 2. Configurar variables de entorno
# Copiar .env.example a .env y completar:
#   MONGODB_URI (de MongoDB Atlas)
#   CLERK_PUBLISHABLE_KEY y CLERK_SECRET_KEY (de Clerk dashboard)
#   CLERK_WEBHOOK_SIGNING_SECRET (opcional para webhooks locales)

# 3. Iniciar aplicaciones en desarrollo
# API en http://localhost:3000/api
npx nx serve api

# Web en http://localhost:4200 (en otra terminal)
npx nx serve web

# 4. Ejecutar tests
# Tests unitarios de API (incluye motor de viabilidad)
npx nx test api

# Verificación completa (lint, test, build de todas las apps/libs)
npx nx run-many -t test lint build --all

# 5. Despliegue preview (requiere cuentas en Vercel y Render)
# Vercel: vercel --prod (después de vincular repo)
# Render: manual - enviar deploy hook después de configurar variables de entorno
```

**Nota:** Los tests asumen acceso a una instancia de MongoDB Atlas. Para testing totalmente local sin credenciales reales, se necesitaría mockear la capa de persistencia - fuera del alcance de este demo intencionalmente para demostrar integración real con servicios en la nube.

---

## 📄 Licencia y contacto

**Licencia:** Este proyecto está bajo licencia MIT - ver archivo [LICENSE](LICENSE) para detalles.

**Contacto:** 
- **Autor:** Jorge Adán (desarrollador demostrando capacidades)
- **Orquestador de IA:** Elías (Hermes Agent perfil hermes2)
- **Propósito:** Portafolio profesional para demostrar construcción de software a medida gestionado con IA y análisis de negocio en dominios desconocidos
- **Repositorio:** https://github.com/jordan/kavana-viability-executive (ejemplo - ajustar según corresponda)

---

> **Transparencia total:** Kavana Viability Executive es un **MVP DEMO/PORTFOLIO**, no un producto para uso real. 
> - Los datos de negocio en fixtures son del modelo demo, no de promotoras reales
> - Algunas características están intencionalmente simplificadas o pendientes por diseño de portafolio
> - El objetivo es demostrar proceso técnico y habilidades de análisis, no tracción comercial
> - Todas las decisiones técnicas están documentadas abiertamente en los ADRs y specs
> - Este readme refleja honestamente el estado, propósitos y limitaciones del proyecto