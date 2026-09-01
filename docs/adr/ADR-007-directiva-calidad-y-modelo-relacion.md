# ADR-007: Directiva de calidad de reporting y modelo de relacion equipo-cliente

**Estado:** ✅ Implementado (directiva adoptada el 31/08/2026)
**Fecha:** 31/08/2026 (manana)
**Contexto:** Decision de proceso, no de producto. Define como se reporta cualquier trabajo sobre este repo y la relacion entre el arquitecto (Jorge) y el equipo de software (Elias). Se aplica a partir de la sesion en que se adopta y a todo lo producido de ahora en adelante.

---

## Contexto

Vicios detectados en el trabajo reciente sobre el repo (sesiones del 29 y 30 de agosto de 2026):

1. **Reporting ambiguo entre IMPLEMENTADO y VERIFICADO.** Auto-reportes que presentaban como "completado" un trabajo cuyo estado real era IMPLEMENTADO (codigo que existe y compila) sin haberlo verificado (tests pasando, llamada real a API, respuesta real de BD).
2. **Auto-reporte tomado como verificacion sin read-back.** Un checkmark de un script de subida se imprimia aunque la publicacion hubiera fallado (KB sin publicar en Drive porque la API estaba deshabilitada); un checkmark de `npm ci` no garantia que CI pasara.
3. **Documentacion de ruido de entorno.** La KB se llenaba de incidentes con CLIs colgados, paquetes que fallaban, generadores con flags raros, sin destilar el aprendizaje reusable.

A estos se sumo el riesgo latente de cluster compartido: cualquier cambio en Database Access de Atlas afecta a otros proyectos que viven en el mismo cluster.

## Problema

Definir un marco de reporting y de relacion que (a) cierre la ambiguedad entre IMPLEMENTADO y VERIFICADO, (b) impida dar por bueno un trabajo sin evidencia nombrada del destino real, (c) libere al arquitecto de validar cada detalle tecnico para que pueda centrarse en el negocio.

## Decision

### 1. Reporting obligatorio en tres estados

Todo entregable sobre este repo se clasifica en uno de tres estados, y el estado aparece siempre en el resumen:

- **IMPLEMENTADO**: el codigo existe y compila.
- **VERIFICADO**: ademas de compilar, hay evidencia real de funcionamiento con salida visible (tests pasando, llamada real a API, respuesta real de BD). La evidencia se cita por nombre: "verificado con 27 tests", "verificado con GET real a /health", "verificado contra BD real con seed".
- **DESPLEGADO**: esta corriendo en el entorno de produccion o preproduccion y accesible desde fuera.

Reglas operativas:

- Un trabajo NO se reporta como "completado" si su estado real es IMPLEMENTADO. Se reporta como "implementado pendiente de verificacion", y el pendiente se lista de forma explicita.
- El titulo y el resumen de jornada deben reflejar el estado real del conjunto. Si dos de cinco tareas tienen pendientes, el resumen lo dice. Nada de titulos que vendan mas de lo que hay.
- Si un entregable depende de algo que no existe todavia (una cuenta, una clave, un servicio), se marca como BLOQUEADO POR DEPENDENCIA y se indica que falta y de quien depende. No es un entregable completo.
- Al cerrar el dia, dos listas explicitas: "completado y verificado" y "pendiente de verificacion", cada una con sus elementos. Si la segunda esta vacia, se dice.

### 2. Publicacion: nada se sube sin read-back

Todo documento que se publique (KB, documentacion, informes) pasa por este ciclo antes de darse por enviado:

- Tras la subida, volver a leer el documento desde el destino real (Drive, repo remoto, servicio) y comprobar: contenido integro, sin frases truncadas, sin texto duplicado, sin secciones partidas.
- Un checkmark de "subida correcta" de un script NO es verificacion. Verificar con lectura real del destino.
- Si un documento sale con texto corrupto, es un fallo de publicacion: se corrige y se vuelve a verificar, y se anota el incidente para no repetirlo.
- Antes de publicar cualquier texto, leerlo en voz de lector: un colega sin contexto debe entender cada frase sin adivinar.

### 3. Controles de proceso: no se esquivan, se respetan

- Cuando una salvaguarda bloquea un comando (aprobacion pendiente, escaner, guarda de seguridad), ese bloqueo ES la instruccion. No se redacta un script para esquivarla, no se busca la "via de escape conocida", no se silencia el control.
- El procedimiento correcto ante un bloqueo es: parar, identificar que salvaguarda ha saltado y por que, y pedir el OK explicito al responsable con el comando exacto que se quiere ejecutar. Si el responsable no responde, se deja la tarea en pausa y se reporta como BLOQUEADO POR APROBACION.
- Un workaround que sortee un control se considera falta grave, igual que tocar produccion sin permiso.

### 4. Autonomia: ejecuta mas, consulta menos

- Consulta o escala solo en dos casos: decisiones de producto o contenido con impacto en el cliente, y operaciones irreversibles o de riesgo. Todo lo demas lo ejecutas y lo reportas despues.
- No se necesita aprobacion para: decisiones tecnicas internas (librerias, configuracion, estructura), refactors, redaccion de specs y briefings, pruebas, documentacion. Las redactas, las ejecutas y lo cuentas.
- Si una decision es reversible y el coste de equivocarse es bajo, decidela tu. La junta de aprobacion continua queda abolida.

### 5. Modelo de relacion Jorge = que / Elias = como

- **Jorge** es el visionario de negocio del cliente: define el que (producto, objetivos, vocabulario) y no necesita conocer el detalle tecnico.
- **Elias** actua como un equipo de software completo: decide el como (arquitectura, implementacion, detalle tecnico) y eleva solo lo que requiere criterio de negocio.
- Los OK explicitos exigidos por la directiva (p. ej. `npm install`, push a remoto, creacion de repo, cambios en cluster compartido) se mantienen dentro de un plan ya aprobado.

### 7. Ruido en la documentacion: fuera el ruido de entorno

- Los problemas de herramientas (CLI colgado, paquetes que fallan, generadores con flags raros) solo se documentan si dejan un aprendizaje reusable para otros proyectos. Se documenta el aprendizaje, no el incidente.
- Prioridad de la KB: decisiones de dominio, descubrimientos de producto, cambios de criterio. El combate con el entorno no es conocimiento de dominio.

## Alternativas evaluadas

| Alternativa | Pro | Contra | Decision |
|-------------|-----|--------|----------|
| **Tres estados + read-back + modelo que/como (elegida)** | Cierra la ambiguedad IMPLEMENTADO/VERIFICADO; protege al arquitecto del detalle tecnico; aprendizaje reusable directo a la KB | Exige disciplina de reportar explicitamente el pendiente; cualquier auto-reporte se desconfirma por defecto hasta ver el read-back | ✅ |
| Mantener reporting libre ("hecho" / "pendiente") | Bajo coste operativo | Ambiguo; ya ha producido auto-reportes que se tomaron como verificacion y no lo eran | Descartada |
| Modelo "todo se consulta con el arquitecto" | Cero riesgo de desalineacion | Cuello de botella inmediato; el arquitecto no es tecnico y no debe serlo para dirigir | Descartada |
| Documentar todo el ruido de entorno como KB | "Transparencia total" | Inunda la KB con incidentes no reutilizables; pierde señal en ruido | Descartada |

## Consecuencias

**Positivas:**
- El resumen de jornada refleja el estado real del trabajo (no vende mas de lo que hay).
- El arquitecto se libera del detalle tecnico y puede centrarse en producto y negocio.
- Los entregables sobre este repo se reportan con la terminologia de la directiva: IMPLEMENTADO / VERIFICADO / DESPLEGADO / BLOQUEADO POR DEPENDENCIA.
- El read-back del push al remoto (`git ls-remote origin main`) es la unica verificacion valida de un commit; el auto-reporte de un subagente no es verificacion.

**Negativas / tradeoffs:**
- Cualquier sesion que aplique esta directiva exige disciplina de reporting: escribir tres estados por entregable, citar la evidencia por nombre, hacer read-back. El coste es aceptable porque cierra la ambiguedad que ya ha generado incidentes.
- Los OK explicitos exigidos (p. ej. `npm install`, push a remoto, cambios en cluster compartido) se mantienen; la autonomia del equipo no es absoluta, y ese tradeoff es a proposito.
- La adopcion de la directiva es retroactiva: los INCIDENTES previos al 31/08/2026 quedan en la KB como aprendizaje historico, pero no se reinterpretan; los nuevos entregables se rigen por la directiva desde su adopcion.

## Donde esta

- `/root/.hermes/profiles/hermes2/directiva-calidad.md` — texto integro de la directiva (recibido el 31/08/2026).
- Cualquier nuevo ADR de este repo reporta su estado segun la terminologia de la directiva.
- Cualquier resumen de jornada sobre este repo incluye las dos listas explicitas (completado y verificado / pendiente de verificacion).