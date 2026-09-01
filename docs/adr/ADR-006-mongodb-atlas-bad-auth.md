# ADR-006: Saga MongoDB Atlas `bad auth` — diagnostico diferencial y causa raiz

**Estado:** ✅ Implementado (verificacion de la tarea 7 cerrada el 31/08/2026)
**Fecha:** 31/08/2026
**Contexto:** La tarea 7 (ADR-004, persistencia MongoDB) quedo implementada pero sin verificar contra BD real. La verificacion arranca con `nx serve api` y `MONGODB_URI`, y la conexion a Atlas falla con `bad auth: Authentication failed` (codigo 8000) repetidamente. La saga duro 6 rondas sin cambios destructivos hasta identificar la causa raiz y dejar la conexion verde.

---

## Contexto

La URI de MongoDB Atlas (`mongodb+srv://<user>:<pass>@kavanasystems.nbsqpou.mongodb.net/<db>?retryWrites=true&w=majority`) se construye desde el `.env` de la API (`apps/api/.env`, gitignored, chmod 600). La API arranca con la URI pero `mongoose.connect()` rechaza la autenticacion contra `kavana_apartaments` con error 8000 indistinguible: misma excepcion para contrasena mala, usuario inexistente o IP no permitida en la allowlist.

El cluster `kavanasystems.nbsqpou.mongodb.net` es compartido: conviven `vistaprod_v2` (produccion de otro proyecto, PROHIBIDO tocar) y `kavana_apartaments` (este proyecto). El usuario dedicado `kavana_apartaments_user` se creo en la UI de Atlas con "Generate Password" y la cadena del `.env` se formo a partir de esa contrasena, pero la conexion no funciona.

## Problema

Resolver `bad auth` persistente contra MongoDB Atlas sin introducir cambios destructivos (resets a ciegas, tocar la BD de otro proyecto, dejar la URI sin documentar) y dejar documentado el aprendizaje para que la siguiente saga de este tipo en cualquier proyecto Kavana tarde una ronda, no seis.

## Decision

**Protocolo de diagnostico diferencial antes de tocar credenciales**, con tres causas a separar con pruebas controladas:

1. **Formato de URI / allowlist de IP**: la URI debe tener exactamente la forma esperada por el driver (sin espacios, sin caracteres sin codificar, `%40` para `@` si la URL-encoding lo exige); la allowlist de Atlas (`IP Access List`) debe contener la IP publica del servidor (verificada con `curl ifconfig.me`) o un rango que la cubra (`0.0.0.0/0` para todo el trafico, con la advertencia de seguridad correspondiente).
2. **Usuario de BD existente y contrasena persistida**: el usuario debe existir en `Database Access` y su contrasena debe estar guardada (Atlas solo guarda la contrasena si se completa el flujo de creacion; "Generate Password" dentro del dialogo de creacion de usuario NO la persiste hasta confirmar con "Add User").
3. **Secreto sin caracteres problematicos**: la contrasena en la URI no debe contener corchetes angulares (`<`, `>`), espacios, ni otros caracteres sin codificar URL; el verificador debe mirar el contenido exacto, no solo longitud y clases de caracteres.

**Aplicacion concreta del 31/08/2026:**

| Ronda | Causa bajo prueba | Resultado | Conclusion |
|-------|-------------------|-----------|------------|
| 1 | Formato de URI (caracteres sin codificar) | Comprobacion estructural; longitud OK | No es formato |
| 2 | Allowlist de IP (IPv4 vs IPv6, IP publica) | TCP llega a los 3 shards, `0.0.0.0/0` activo en Atlas | No es allowlist |
| 3 | SCRAM (SCRAM-SHA-1 vs SCRAM-SHA-256) | Atlas fuerza SHA-256 por defecto; no configurable por URI | No es SCRAM |
| 4 | Usuario `kavana_apartaments_user` existe y contrasena guardada | Usuario visible en `Database Access`; contrasena nunca persistida | **Causa raiz probable** |
| 5 | Contrasena envuelta en `<>` al pegar | Verificacion visual detecta `<tuContrasena16>` en la URI; circcion ortica (quitar `<` y `>`) sin leer el secreto | Confirmacion de verificacion fragil |
| 6 | Crear usuario `ka_test` desde cero con flujo completo | Conexion al primer intento | **Confirmado**: la causa raiz era que `kavana_apartaments_user` se creo sin completar el guardado final de la contrasena |

**Causa raiz identificada**: el usuario `kavana_apartaments_user` se creo en la UI de Atlas sin completar el paso final de "Generate Password" → "Add User". Atlas nunca persistio su contrasena. Cualquier intento de conexion con ese usuario falla con `bad auth` aunque la contrasena en el `.env` parezca correcta, porque en Atlas no existe.

**Accion correctiva**: crear `ka_test` desde cero siguiendo el flujo completo (Database Access → Add New Database User → Authentication Method: Password → Generate Password con autoguardado → Add User). Conectar al primer intento. `kavana_apartaments_user` queda en desuso (no se borra para preservar el historial de Atlas).

**Aprendizaje reusable (de la KB del 31/08/2026, destilado):**

- Atlas nunca vuelve a mostrar la contrasena de un usuario de BD. El dialogo "Connect" inserta el marcador literal `<db_password>`; la contrasena solo se recupera reseteandola en Security → Database Access.
- El selector de "driver" del dialogo "Connect" no configura nada: solo decide el codigo de ejemplo y el formato de la cadena. El cluster es agnostico al lenguaje.
- El error `bad auth` (codigo 8000) de Atlas es indistinguible entre contrasena incorrecta, usuario inexistente e IP no permitida. Atlas enmascara el bloqueo de IP como error de autenticacion; solo forzando IPv6 devuelve el mensaje explicito de allowlist.
- Una credencial "recuperada" del historial de git puede ser el marcador literal `<db_password>` (13 caracteres), no la contrasena real. Verificar siempre contra el sistema real.
- Validar el contenido exacto del secreto (ausencia de corchetes, espacios, caracteres sin codificar), no solo su forma general (longitud, clases de caracteres).

## Alternativas evaluadas

| Alternativa | Pro | Contra | Decision |
|-------------|-----|--------|----------|
| **Diagnostico diferencial en 6 rondas (elegida)** | Cero cambios destructivos; causa raiz identificada con evidencia; aprendizaje reusable para futuras sagas; preserva el cluster compartido (no toca `vistaprod_v2`) | Coste: 6 rondas (~4h); exige disciplina de no tocar credenciales hasta tener evidencia | ✅ |
| Reset a ciegas de la contrasena de `kavana_apartaments_user` al primer `bad auth` | Rapido (1 ronda) | Si la causa raiz es que la contrasena nunca se guardo (que lo era), el reset no resuelve nada; ademas el "Generate Password" sin completar el flujo tampoco ayuda | Descartada |
| Crear un nuevo cluster dedicado para el proyecto | Aislamiento total | Trabajo gratis para un proyecto sin datos de operacion; duplica costes | Descartada (YAGNI) |
| Migrar a otro motor (Postgres, Supabase) | Ecosistema mas familiar, menos secretos opacos | Duplica el stack; introduce otra curva de aprendizaje sin evidencia de que resuelva el problema raiz | Descartada |

## Consecuencias

**Positivas:**
- La verificacion de la tarea 7 (ADR-004) se cerro: API arrancando contra Atlas real (`nx serve api` con `MONGODB_URI` real), `GET /api/promotions` responde 401 sin token (guard de Clerk), smoke test OK.
- El usuario `ka_test` queda documentado como usuario dedicado, con la contrasena en el `.env` (gitignored, chmod 600) escrita directamente por Jorge via SSH.
- El aprendizaje reusable queda en este ADR y en la skill de stack del proyecto; futuras sagas de `bad auth` en otros proyectos Kavana se resuelven en una ronda.

**Negativas / tradeoffs:**
- 6 rondas de diagnostico en una sola jornada es tiempo que se resta de otras tareas; el coste es aceptable porque el problema era bloqueante (sin URI real la tarea 7 no se verifica) y el aprendizaje amortiza futuras sagas.
- El cluster compartido obliga a inventariar los consumidores antes de cualquier cambio de usuarios: el workflow programado `Kavana Live Factory Simulator` del repo `kavanasystemsinfo-ui/kavanasystems` lleva la URI con la contrasena del usuario de ese otro proyecto embebida en el script (no usa secrets de GitHub). Cualquier cambio en la allowlist o en Database Access debe coordinarse para no romper ese workflow (verificado: fallo el 29/08/2026 con `bad auth` al mismo tiempo que nuestra saga, causa distinta).
- El `.env` se congela durante las rondas de verificacion: Jorge no debe editarlo entre pruebas sin avisar, porque cada edicion desincroniza la verificacion.

## Donde esta

- `apps/api/.env` — URI con usuario `ka_test` y contrasena escrita por Jorge (gitignored, chmod 600).
- `apps/api/src/auth/` — codigo de auth Clerk (no tocado por esta saga; la verificacion solo afecta a `MONGODB_URI`).
- `apps/api/src/viability/` — `viability.service.ts` y `promotions.controller.ts` (consumidores de la BD; verificados en el smoke test post-fix).
- Skill `kavana-apartaments-stack` → `references/atlas-credential-pitfalls.md` y `references/mongodb-atlas-conexion.md` (detalle operativo de la saga).
- Skill `mongodb-atlas-connections` (perfil de Hermes): guia operativa de conexion a Atlas con diagniostico de errores.

## Verificacion (31/08/2026)

- `nx serve api` arranca con `MONGODB_URI` real: log "Nest application successfully started" + "Kavana Viability Executive API running on: http://localhost:3000/api".
- `GET /api` → 401 `{"message":"Missing or invalid Authorization header"}` (guard de Clerk protege la ruta).
- `GET /api/promotions` (sin token) → 401 (idem).
- Suite de tests verde (66 tests en 11 suites, ver `docs/METRICS.md`).