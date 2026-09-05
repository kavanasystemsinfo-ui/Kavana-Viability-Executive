# Spec Técnica: Agente Asesor de Viabilidad (KVE)

## 1. Resumen ejecutivo

Kavana Viability Executive (KVE) es un proyecto construido end-to-end: desde la identificación de una oportunidad de negocio (viabilidad objetiva de promociones inmobiliarias) hasta el despliegue operativo de un producto software usable. El agente asesor de viabilidad es la pieza final de esa cadena — convierte el motor determinista de cálculo y los datos reales de la empresa en respuestas claras, citadas y operativas, mediante orquestación con function calling sobre los endpoints ya existentes.

Propuesta de valor del agente:

- Conecta lenguaje natural con datos reales del motor de viabilidad (sin inventar cifras).
- Cita explícitamente las fuentes (promoción consultada, umbral aplicado, endpoint invocado).
- Opera con coste de producción optimizado por defecto (OpenRouter + modelos free) y arquitectura abierta a proveedores de pago cuando se requiera.
- Se integra como widget en el dashboard existente respetando rol, sesión y configuración del usuario.

El proyecto demuestra capacidad de llevar una idea desde la primera toma de visión de negocio hasta el despliegue, construyendo el MVP con el menor coste de producción posible sin sacrificar trazabilidad ni veracidad.

## 2. Capacidad demostrada por el proyecto completo

El agente asesor no es un módulo aislado: es la capa de orquestación conversacional sobre un sistema ya construido. El proyecto KVE ya entrega, verificado:

| Capa entregada | Qué demuestra |
|---|---|
| Visión de negocio | Modelado del dominio (promociones, unidades, costes, ingresos, KPIs de margen) y definición de umbrales de viabilidad por defecto (18% margen bruto). |
| Dominio modelado | Esquemas Mongoose para promociones, unidades, runs de viabilidad y configuración de usuario. |
| Motor puro | Librería `@kavana-viability-executive/viability-engine` con `calcularViabilidad` determinista, sin dependencias de UI ni de proveedor LLM. |
| API REST | Endpoints `GET /api/promotions` y `GET /api/promotions/:id/viability`, consumidos por el orquestador. |
| Autenticación y autorización | Roles (viewer, analyst, admin) aplicados en la capa de servicio antes de devolver datos al LLM. |
| Dashboard | Interfaz web existente donde el agente se integra como widget (Fase 2). |
| Agente (esta spec) | Orquestador LLM con function calling sobre los endpoints anteriores. |

El agente hereda todo lo construido y añade la pieza de interacción en lenguaje natural sin duplicar lógica de cálculo ni de persistencia.

## 3. Arquitectura del agente

### Endpoint principal

- **POST `/api/chat`**: recibe mensajes en lenguaje natural y devuelve respuestas orquestadas.

### Prompt de sistema

```
Eres un asistente de viabilidad dentro del sistema KVE. Tu función es
consultar datos reales del motor de viabilidad determinista y devolver
respuestas claras, citadas y operativas.

Capacidades disponibles:
1. Listar promociones disponibles (endpoint GET /api/promotions).
2. Calcular la viabilidad de una promoción específica
   (endpoint GET /api/promotions/:id/viability).

Reglas de funcionamiento:
- Trabaja siempre sobre datos obtenidos de los endpoints anteriores.
  Nunca inventes cifras, supuestos ni recomendaciones estratégicas.
- Si no dispones de datos suficientes para responder, indícalo
  explícitamente y sugiere el siguiente paso (ej: pedir el identificador
  de la promoción).
- Cita en cada respuesta la promoción consultada, el endpoint invocado
  y el umbral de viabilidad aplicado (por defecto 18% margen bruto).
- Usa el formato numérico español: punto para miles, coma para decimales
  (ej: 1.245.320,50 €).
- Responde en español natural, con Markdown claro (tablas para datos
  numéricos, viñetas para listas, negrita para énfasis).
- Si el usuario solicita formato máquina (JSON), devuelve un objeto
  estructurado con `respuesta`, `datos` y `fuentes`.
- Cuando una pregunta quede fuera del alcance del motor (por ejemplo,
  recomendaciones de inversión o predicciones de mercado), explícalo
  con naturalidad y propón qué dato del sistema sí puede responderla.
```

### Herramientas declaradas al LLM

```json
[
  {
    "type": "function",
    "function": {
      "name": "listarPromociones",
      "description": "Obtiene el listado de todas las promociones disponibles en el sistema",
      "parameters": {
        "type": "object",
        "properties": {},
        "required": []
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "calcularViabilidadPromocion",
      "description": "Calcula la viabilidad de una promoción específica usando el motor de viabilidad",
      "parameters": {
        "type": "object",
        "properties": {
          "promotionId": {
            "type": "string",
            "description": "Identificador único de la promoción (ej: promo-la-marina-2)"
          }
        },
        "required": ["promotionId"]
      }
    }
  }
]
```

### Ejecución contra MongoDB + motor

1. El LLM decide qué herramienta invocar según la consulta del usuario.
2. El endpoint `/api/chat` ejecuta la herramienta correspondiente:
   - `listarPromociones` → `ViabilityService.listarPromociones(companyId)`.
   - `calcularViabilidadPromocion` → `ViabilityService.calcularViabilidadPromocion(companyId, promotionId)`.
3. Los servicios ya existentes:
   - Obtienen documentos desde MongoDB Atlas vía Mongoose.
   - Los traducen al formato de entrada del motor puro.
   - Ejecutan `calcularViabilidad` de `@kavana-viability-executive/viability-engine`.
   - Persisten el run en la colección `viability_runs` para trazabilidad.
4. El resultado se devuelve al LLM para que formule la respuesta natural citando las fuentes.

## 4. Optimización del coste de producción

Una decisión central del proyecto es construir el MVP con el menor coste de producción posible sin sacrificar veracidad ni trazabilidad. Esto se concreta en la arquitectura multi-proveedor:

- **Proveedor por defecto: OpenRouter**, con modelos gratuitos (ej: `google/gemini-flash-1.5`). Permite arrancar la primera versión operativa sin claves de pago y mantener coste cero mientras el uso se mantenga en tier gratuito.
- **Arquitectura abierta a cualquier proveedor soportado** (OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter). El usuario puede cambiar de proveedor y modelo desde la pantalla de Ajustes sin tocar código.
- **Escalado a pago bajo demanda**: cuando el volumen o la sensibilidad de los datos lo justifiquen, el usuario configura un proveedor de pago y el sistema lo aplica sin redeploy.
- **Detección automática de tier**: el sistema identifica si el proveedor/modelo configurado es gratuito o de pago para activar o no el rate limiting (ver §6).

Esta arquitectura reduce el coste de producción inicial del MVP a esencialmente cero en infraestructura LLM, a la vez que deja preparada la migración a un proveedor privado cuando el caso de uso lo requiera.

## 5. Configuración por usuario

### Modelo de datos de configuración (por usuario/empresa)

```json
{
  "llmProvider": "openrouter",          // openai, anthropic, gemini, deepseek, openrouter
  "modelName": "google/gemini-flash-1.5",
  "apiKey": null,                        // opcional; almacenamiento seguro si se provee
  "maxTokensPerDay": 10000,              // definido por el usuario
  "maxRequestsPerDay": 1000              // definido por el usuario
}
```

- Lista de proveedores soportados (verificados): OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter.
- La configuración se guarda por usuario/empresa en la base de datos (colección `user_settings`).
- El cambio de proveedor/modelo aplica en caliente, sin redeploy.
- El almacenamiento de claves se realiza de forma segura (cifrado en reposo); el alcance exacto del esquema de cifrado se confirma en la fase de implementación.

## 6. Roles y guardarraíles

Los tres roles (viewer, analyst, admin) pueden usar el agente. Las herramientas internas filtran resultados según el rol del request, garantizando que el LLM nunca reciba datos que el usuario no podría ver directamente en el dashboard.

| Rol | Capacidades permitidas |
|---|---|
| viewer | Listar promociones: solo resumen (id, nombre, margen básico). Calcular viabilidad: solo sobre promociones ya listadas para ese rol. |
| analyst | Listar promociones: resumen completo. Calcular viabilidad: resultado completo + desglose de KPIs y comparaciones básicas. |
| admin | Listar promociones: todo. Calcular viabilidad: todo + capacidades administrativas (ej: solicitud de recálculo). Configuración de umbrales del motor vía endpoint independiente. |

Implementación: `listarPromociones` y `calcularViabilidadPromocion` reciben el rol del request y aplican los filtros en la capa de servicio antes de devolver datos al LLM.

### Límites y presupuesto

- Servicio de tracking obligatorio de tokens y requests por usuario/empresa.
- Bloqueo del servicio al superar `maxTokensPerDay` o `maxRequestsPerDay` configurados, con respuesta: *"Ha superado su límite diario de consumo. Ajuste su configuración en Ajustes o espere hasta mañana."*
- **Rate limiting condicional**: se aplica únicamente cuando el proveedor configurado es de pago (OpenAI, Anthropic, etc.). Para modelos gratuitos (OpenRouter free, Gemini free) no se aplica rate limiting porque no hay coste por uso. La detección es automática a partir del proveedor y modelo configurados.

## 7. Privacidad

- **Trade-off conocido**: los modelos en tier gratuito son adecuados para datos no sensibles. Para datos sensibles (información personal identificable, datos financieros confidenciales) se recomienda configurar un proveedor privado en Ajustes.
- **Banner informativo persistente** en el frontend cuando el proveedor configurado está en tier gratuito:
  *"Estás usando un modelo gratuito. Estos modelos pueden ser sensibles a información personal. Para datos reales, configura un proveedor privado en Ajustes."*
- El banner informa, no bloquea el uso.
- Para proveedores de pago no se muestra el banner.
- En el MVP, la trazabilidad del run (`viability_runs`) se mantiene siempre en la base de datos propia, independientemente del proveedor LLM.

## 8. Formato de respuesta

- **Por defecto**: respuesta natural en Markdown, con tablas para datos numéricos, viñetas para listas y negrita para énfasis.
- **Formato máquina bajo solicitud**: si el usuario pide explícitamente JSON (`"dame los datos en JSON"`, `"formato JSON"`, `"output JSON"`), el agente devuelve un objeto con:
  - `respuesta`: texto en Markdown.
  - `datos`: objeto con los datos crudos utilizados.
  - `fuentes`: array de endpoints consultados y parámetros.
- El widget frontend renderiza Markdown por defecto y dispone de un toggle opcional (uso de desarrollo) para ver el JSON crudo.

## 9. Plan de entrega en dos fases

### Fase 1 — Endpoint backend standalone

- Desarrollar y probar `POST /api/chat` de forma independiente.
- Verificación con curl o Postman:

  ```bash
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "Dame el resumen de todas mis promociones"}'
  ```

- Cobertura de pruebas: unidades e integración para el orquestador, el prompt y las herramientas.
- Sin dependencia de frontend; se valida directamente contra el backend.

### Fase 2 — Integración como widget en el dashboard

- Tras validar Fase 1, integrar el agente como widget de chat en el dashboard existente.
- Botón flotante o panel desplegable.
- Reutiliza el contexto de sesión del dashboard (autenticación, rol, configuración de usuario).
- Muestra 3–5 sugerencias de preguntas predefinidas al abrir el widget.
- Respeta el banner de privacidad según el proveedor configurado.

## 10. Cuestiones abiertas para implementación

Antes de empezar a codificar, resolver:

- ¿Se arranca con las claves gratuitas de OpenRouter o se requiere una cuenta abierta desde el primer momento?
- ¿Dónde se persiste la configuración de LLM por usuario (colección concreta, índice, esquema de cifrado)?
- ¿Se mantiene un único endpoint `/api/chat` para Fase 1 y Fase 2 o se versiona (`/api/chat/v2`, etc.)?
- ¿Cómo se aplica el cambio de configuración de LLM en la sesión activa sin recargar la página?
- ¿Se expone un endpoint de salud `/api/chat/health` para verificar que el orquestador está activo?
- ¿Qué política de reintentos y mensaje amable se aplica cuando el LLM devuelve error o timeout?
- ¿Se registran preguntas y respuestas en logs para auditoría, omitiendo datos sensibles?
- ¿Se cubre en tests el rate limiting condicional tanto con modelos gratuitos como de pago?

---

*Spec alineada con la directiva ADR-007: reporting honesto, veracidad operativa y diferenciación explícita entre lo construido y verificado, lo pendiente y las decisiones abiertas. La capacidad demostrada es la del proyecto completo — motor determinista, API, autenticación, dashboard y orquestador —, no la de un módulo aislado.*