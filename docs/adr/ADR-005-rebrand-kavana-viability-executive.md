# ADR-005: Rebrand a Kavana Viability Executive y roadmap congelado del Satellite Kavana Executive

**Estado:** ✅ Implementado (mergeado en `main` el 31/08/2026, commit `c372635`)
**Fecha:** 31/08/2026 (aprobado en sesion) / 31/08/2026 (ejecutado en commit inicial del repo nuevo)
**Contexto:** Tarea de branding y arquitectura. El nombre anterior "Kavana Apartaments" no reflejaba el dominio real del producto (viabilidad de promociones para promotoras inmobiliarias) y se proyecta un segundo producto gemelo para gestion de inmobiliarias. Se renombra el producto actual y se deja congelada la decision de arquitectura del satelite futuro.

---

## Contexto

Kavana Apartaments era un SaaS B2B multi-tenant de **viabilidad de promociones inmobiliarias** para promotoras. Su nucleo es un motor de viabilidad puro (`@kavana-viability-executive/viability-engine`, 24 tests) expuesto por una API NestJS 11 (`apps/api`, global prefix `/api`, endpoints `/api/promotions` y `/api/promotions/:id/viability`) y consumido por una web Angular 22 SSR (`apps/web`).

Tres problemas con el estado anterior:

1. **El nombre miente sobre el dominio.** "Apartaments" suena a alquiler residencial, brokerage o gestion de stock terminado. La unidad de negocio es la **promocion**, el cliente es la **promotora**, y el producto calcula **viabilidad** de promociones (costes, ingresos, margenes, escenarios). El motor, los fixtures (`fixtures/companies/kavana-viability-executive/docs/promociones.yaml`, 6 promociones) y el seed estan alineados con ese dominio; el nombre, no.
2. **Hay un segundo producto en el roadmap** enfocado a gestion de inmobiliarias (brokerage: captacion, mandates, leads, stock de segunda mano y, eventualmente, de obra nueva terminada de la promotora). Si los dos productos comparten un apellido de marca comun, la linea "Kavana ___ Executive" se lee como una familia coherente y evita reinventar la marca.
3. **El repo publico de referencia de la empresa** (`kavanasystemsinfo-ui/Kavana-Warehouse`) documenta en markdown plano (`docs/adr/`, `docs/DECISIONES_ESTRATEGICAS.md`, `references/*.md`). El estandar documental es markdown con plantilla KES, no DOCX con plantilla corporativa. Este ADR se alinea con ese estandar.

## Problema

Como renombrar el producto actual para que el nombre refleje el dominio y habilite la futura linea de productos, sin acarrear cambios innecesarios en la base de datos, las plataformas externas (Atlas, Clerk, Vercel, Render, GitHub) ni la operativa del dia a dia, y dejando congelada la decision de arquitectura del satelite futuro?

## Decision

**Renombrar el producto actual a `Kavana Viability Executive` y dejar `Kavana Executive` como nombre congelado (sin implementar) para el futuro satelite de gestion de inmobiliarias.** El cambio se aplica a nivel de marca y de monorepo; la base de datos, los usuarios Mongo, los secretos y la mayoria de los identificadores externos se quedan como estan.

### Lo que cambia (cambios minimos)

1. **`package.json` raiz**: `name: "kavana-apartaments"` → `name: "kavana-viability-executive"`. Descripcion actualizada con el posicionamiento de marca.
2. **`tsconfig.base.json`** (raiz): los cuatro aliases pasan de `@kavana-apartaments/*` a `@kavana-viability-executive/*`:
   - `@kavana-apartaments/shared` → `@kavana-viability-executive/shared`
   - `@kavana-apartaments/rag` → `@kavana-viability-executive/rag`
   - `@kavana-apartaments/agents` → `@kavana-viability-executive/agents`
   - `@kavana-apartaments/viability-engine` → `@kavana-viability-executive/viability-engine`
3. **Imports en codigo**: barrido global de `@kavana-apartaments/...` → `@kavana-viability-executive/...`. La libreria de viabilidad se publica con el nuevo scope.
4. **Fixtures**: la carpeta `fixtures/companies/kavana-apartaments/` se renombra a `fixtures/companies/kavana-viability-executive/`. El contenido del YAML no se toca (es narrativa del cliente demo, no producto).
5. **`companyId` por defecto** (en fixtures y en el seed `apps/api/src/seed/seed.ts`): `kavana_apartaments` → `kavana_viability_executive`. El seed es upsert idempotente por `(companyId, promotionId)`, asi que re-seed crea los documentos con el nuevo `companyId`.
6. **Reset de BD + re-seed desde cero** (opcion A): la BD `kavana_apartaments` no contiene datos de operacion (verificado el 31/08/2026: el producto no se ha usado, no hay tenants adicionales, no hay `viability_runs` con datos reales). Migrar seria sobreingenieria. Se opta por `dropDatabase()` y re-seed. Sin scripts de migracion, sin abortos condicionales.
7. **Marcas visibles**: `README.md` raiz, `docs/adr/`, `docs/specs/`, `docs/HISTORY.md`, `apps/*/project.json` y cualquier mencion visible al nombre viejo. Se actualizan titulos, descripciones y referencias.
8. **Remoto Git local**: `git remote set-url origin https://github.com/kavanasystemsinfo-ui/Kavana-Viability-Executive.git`. El repo en GitHub se creo nuevo por opcion B (push al repo nuevo), no por rename con redirect.
9. **Narrativa historica**: los ADRs anteriores (001 a 004) NO se renombran en su cuerpo (son narrativa historica); solo se actualizan referencias a paths actuales en donde aplique (las fixtures, los aliases, etc.). Los nombres viejos que aparecen en su contexto narrativo se conservan como registro de la decision en su momento.

### Lo que NO cambia (decisiones explicitas de no-tocar)

1. **Nombre de la BD Mongo** (`kavana_apartaments` en el cluster compartido `kavanasystems.nbsqpou.mongodb.net`): se queda. Esta en un cluster compartido, no se ve en URLs, y renombrarla es trabajo gratis (requeriria `renameCollection` o dump/restore). El rename del repo no obliga a renombrar la BD.
2. **Usuario dedicado Mongo** (`ka_test`): se queda. El usuario `kavana_apartaments_user` quedo en desuso tras la saga bad auth del 31/08/2026 (ver ADR-006). Cambiar de usuario abre otro ciclo de bad auth sin aportar valor.
3. **URI en `apps/api/.env`**: no se toca, porque la BD no cambia de nombre y la URI ya contiene el nombre actual de BD.
4. **Atlas UI y nombre del cluster** (`kavanasystems.nbsqpou.mongodb.net`): se queda. Es nombre de proyecto de Atlas, no de repo.
5. **Variables de Clerk** (pk_/sk_): se quedan. El issuer de Clerk no tiene nada que ver con el nombre del repo.
6. **Contenido del fixture** (`promociones.yaml`, 6 promociones): solo cambia la carpeta que las contiene, no su contenido (es la promotora ficticia del modelo demo).
7. **Tags, ramas e historial git existentes**: no se reescriben. El rename se hace en una rama nueva `chore/rebrand-kavana-viability-executive` desde `master` y se mergea con PR. Historial limpio.

### Posicionamiento de marca (justificacion del apellido "Executive")

"Executive" como apellido de marca comun a la linea de productos comunica que la herramienta esta diseñada para **directivos que deciden**, no para perfiles tacticos. El producto no es un Excel con formulas: es un motor de decision. Esa es exactamente la diferencia que queremos vender.

Riesgo conocido: en espanol peninsular, "executive" puede leerse como "suite del CEO" en lugar de "herramienta del equipo tecnico-financiero". En un sector conservador como el inmobiliario, esto puede generar una lectura inicial equivoca. No es un bug, es un posicionamiento: si la marca quiere leerse como "premium-tech B2B", esa ambiguedad es aceptable; si no, se sustituye el apellido en una iteracion posterior. La decision queda documentada.

### Roadmap congelado: Kavana Executive (NO IMPLEMENTAR)

El satelite de gestion de inmobiliarias se llamara **`Kavana Executive`**. La arquitectura decidida (tambien congelada) es:

- **Monorepo Nx compartido** con dos apps NestJS separadas, una por producto:
  - `apps/api-promo` (la actual `apps/api` renombrada) → `/api/promotions`, `/api/viability`.
  - `apps/api-brokerage` (NUEVA) → `/api/properties`, `/api/leads`, `/api/mandates`, etc.
- **Web Angular SSR con routing por subdominio o path** (`promo.kavana.app`, `brokerage.kavana.app`).
- **Libs por dominio**: `libs/{viability-engine, brokerage-engine, shared, rag, agents}`. Las libs compartidas solo donde duela (auth, tipos, UI).
- **Integracion por API**: `api-promo` expone su API, `api-brokerage` la consume como cliente externo cuando haya datos cruzados (ej. promocion de la promotora que entra a stock terminado de la inmobiliaria). El conector es un modulo `libs/promo-connector` que es un cliente HTTP.
- **Bases de datos separadas** en el mismo cluster Mongo compartido: `kavana_apartaments` (rebautizada como `kavana_apartaments` por decision consciente; ver arriba) para la promotora, `kavana_brokerage` para la inmobiliaria, ambas con usuario dedicado.
- **Migracion futura a dos repos** cuando los productos diverjan (equipos, ciclos, modelos de negocio). En ese punto las `libs` puras se extraen y las apps se quedan. El split es viable, no requiere reescritura.

Esta decision queda congelada y NO se implementa hasta que el satelite exista de verdad. Cualquier trabajo tecnico sobre Kavana Executive antes de ese momento es prematuro.

## Alternativas evaluadas

| Alternativa | Pro | Contra | Decision |
|-------------|-----|--------|----------|
| **`Kavana Viability Executive` + roadmap `Kavana Executive` (elegida)** | Refleja dominio (viabilidad), apellido de marca comun, simetria con el satelite, posicionamiento premium-tech | Nombre largo (3 palabras en ingles); posicionamiento en ingles compite con SaaS anglosajones | ✅ |
| Renombrar a `Kavana Promociones` (espanol) | B2B claro, "promocion" es la unidad de negocio | "Promociones" no comunica calculo, suena a gestion de stock; no hay simetria clara con el satelite | Descartada |
| Renombrar a `Kavana Viability` (sin "Executive") | Corto, tecnico | Sin apellido de marca comun; el satelite necesita su propio nombre; "Executive" aporta posicionamiento | Descartada |
| Renombrar repo en GitHub y mantener nombre interno `kavana-apartaments` | Minimo cambio, cero riesgo en integraciones | URL del repo miente sobre el producto | Descartada (Jorge eligio opcion B en GitHub: push al repo nuevo) |
| No renombrar y dejar "Kavana Apartaments" como esta | Cero trabajo | El nombre no refleja el dominio; dificulta la linea de productos futura | Descartada |
| Mover a dos repos desde el dia uno del satelite | Independencia total desde el inicio | Duplica CI, secrets, Clerk, Atlas; trabajo gratis antes de tener demanda | Descartada (congelada como evolucion futura) |
| Reset de BD + re-seed con `companyId` nuevo (opcion A, elegida tras verificar BD sin datos de operacion) | Limpio, sin scripts complejos, estado conocido, sin huerfanos | Asume que la BD no tiene datos vivos. Confirmado por Jorge el 31/08/2026 | ✅ |
| Migracion in place con `updateMany` (opcion B, inicialmente propuesta) | Preserva IDs de documento, no requiere recrear indices | Sobreingenieria cuando la BD no tiene datos de operacion | Descartada |
| Dejar la BD con ambos `companyId` conviviendo (opcion C) | Cero riesgo | Confusion a futuro; dos `companyId` para el mismo tenant | Descartada |

## Consecuencias

**Positivas:**
- El nombre del producto refleja el dominio real (viabilidad de promociones) y se posiciona como herramienta de decision para directivos.
- La linea "Kavana ___ Executive" queda abierta para el satelite de inmobiliarias sin tener que renombrar nada mas.
- La BD y los secretos no se tocan: cero riesgo de bad auth, cero riesgo de perdida de datos, cero tiempo de inactividad.
- La BD se resetea con `dropDatabase()` y re-seed: la BD queda en estado conocido, sin documentos huerfanos, sin necesidad de scripts de migracion complejos.

**Negativas / tradeoffs:**
- Tres palabras en ingles en un mercado donde el cliente busca "software para promotoras". Compite en SEO con SaaS anglosajones. Aceptable si el posicionamiento buscado es premium-tech.
- "Executive" en espanol peninsular puede generar una lectura inicial equivoca ("suite del CEO"). Decision consciente, documentada.
- El repo queda con un nombre de BD Mongo (`kavana_apartaments`) que no encaja con el nombre del producto. Tradeoff aceptado: renombrar la BD es trabajo gratis; renombrar el repo no.
- El barrido de imports y la actualizacion documental son trabajo mecanico pero extenso. Se hace con `rg` y reemplazo archivo a archivo, sin sed ciego.

## Donde esta

- `package.json` (raiz) — nombre y description.
- `tsconfig.base.json` (raiz) — aliases `@kavana-viability-executive/*`.
- `fixtures/companies/kavana-viability-executive/docs/promociones.yaml` — fixtures reubicados.
- `apps/api/src/seed/seed.ts` — `companyId` por defecto actualizado.
- `apps/api/.env` — sin cambios (URI apunta a BD `kavana_apartaments`, que se queda).
- `README.md`, `docs/adr/`, `docs/specs/`, `docs/HISTORY.md`, `DECISIONS.md` — documentacion actualizada.
- `node_modules/@kavana-viability-executive/viability-engine` — symlink swap (pitfall 9 documentado en la skill de stack).
- GitHub: `kavanasystemsinfo-ui/Kavana-Viability-Executive` (creado por push al repo nuevo, opcion B).

## Verificacion (31/08/2026, post-merge)

- Commit `c372635` en `main` del repo nuevo `kavanasystemsinfo-ui/Kavana-Viability-Executive`.
- 66 tests verdes en 11 suites (24 del motor + 42 de la API tras el bloque de rebrand que sumo la suite `clerk-auth.module.spec.ts`); verificado con `nx run-many -t test lint build --all` en local.
- Web desplegada en Vercel: `kavana-viability-executive.vercel.app` (HTTP 200).
- API desplegada en Render: pendiente del `RENDER_DEPLOY_HOOK_URL` (manual de Jorge); no es un fallo del rebrand.