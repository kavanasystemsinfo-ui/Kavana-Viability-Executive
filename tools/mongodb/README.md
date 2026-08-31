# MongoDB Atlas Setup for Kavana Viability Executive

## Estructura

```
tools/mongodb/
├── setup.js                    # Crea colecciones, índices, validadores, TTL
├── seed.js                     # Puebla BD con datos de fixtures/
├── vector-search-index.json    # Configuración Atlas Vector Search
├── hybrid-search-index.json    # Configuración Atlas Search (hibrido)
├── package.json                # Scripts npm
└── README.md                   # Este archivo
```

## Requisitos Previos

- **MongoDB Atlas** cluster M10+ (requerido para Atlas Vector Search)
- **MongoDB 6.0+** (time series collections, vector search)
- **Node.js 20+** (para scripts de seed)
- **js-yaml** dependency (`npm install` en `tools/mongodb/`)

## Colecciones Creadas

| Colección | Tipo | TTL | Propósito |
|-----------|------|-----|-----------|
| `companies` | Document | - | Perfil empresa único |
| `promotions` | Document | - | Promociones con índice geoespacial (2dsphere) |
| `users` | Document | - | Sincronizado desde Clerk |
| `knowledge_chunks` | Document | - | RAG chunks con vector search (1536 dims) |
| `episodic_memory` | Time Series | 1 año | Memoria conversacional agentes |
| `audit_log` | Time Series | 7 años | Auditoría inmutable (compliance) |
| `alerts` | Document | - | Alertas proactivas |
| `scenarios` | Document | - | Escenarios decisión (estilo MBA) |
| `chat_sessions` | Document | - | Historial chats ejecutivos |
| `chat_messages` | Time Series | 2 años | Mensajes chat (time-series) |
| `agent_runs` | Document | - | Trazas ejecución agentes |
| `viability_runs` | Document | - | Histórico cálculos motor viabilidad |

## Índices Clave

- **Geospacial**: `promotions.location.coordinates` (2dsphere)
- **Vector Search**: `knowledge_chunks.embedding` (cosine, 1536 dims) - *crear vía Atlas UI*
- **Híbrido**: `knowledge_chunks.content` (Atlas Search) - *crear vía Atlas UI*
- **Compuestos**: companyId + timestamps en todas las colecciones

## Uso

### 1. Instalar dependencias
```bash
cd tools/mongodb
npm install
```

### 2. Configurar variables de entorno
```bash
export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/kavana_apartaments"
```

### 3. Ejecutar setup (crea colecciones e índices)
```bash
npm run setup
# O directamente:
mongosh "$MONGODB_URI" --file setup.js
```

### 4. Crear índices de búsqueda en Atlas UI
**Vector Search Index** (`knowledge_chunks`):
- Name: `vector_index`
- Type: Vector Search
- Field: `embedding` (1536 dims, cosine)
- Filter fields: `companyId`, `source`, `metadata.tags`, `metadata.department`, `metadata.document_type`

**Hybrid Search Index** (`knowledge_chunks`):
- Name: `hybrid_search_index`
- Type: Search
- Fields: `content`, `title` (string), `companyId`, `source`, `metadata.*` (token)

### 5. Poblar con datos de fixture
```bash
npm run seed
# O directamente:
mongosh "$MONGODB_URI" --file seed.js
```

### 6. Verificar
```javascript
// En mongosh
use kavana_apartaments
db.companies.findOne({companyId: "kavana_viability_executive"})
db.promotions.countDocuments({companyId: "kavana_viability_executive"})
db.knowledge_chunks.countDocuments({companyId: "kavana_viability_executive"})
db.episodic_memory.countDocuments({companyId: "kavana_viability_executive"})
```

## Datos de Fixture (Sep 2025)

- **1 empresa**: Kavana Viability Executive
- **6 promociones**: La Marina F2, Mirador del Mar, Los Naranjos, Mar Azul, Cala Serena, Sol Levant
- **14 usuarios**: 8 directivos + 6 jefes de proyecto
- **8 departamentos**: Dirección, Finanzas, Promociones, Jurídico, Comercial, Técnico, Admin/RRHH
- **3 escenarios decisión**: Pricing, Financiación, Licencia
- **10 memorias episódicas**: Decisiones, hitos, juntas, políticas
- **~200 knowledge chunks**: Para RAG (profile, people, departments, promos, escenarios, conocimiento, memoria)

## Integración con Backend (NestJS)

```typescript
// Configuración Mongoose/Typegoose en NestJS
// Variables de entorno requeridas:
MONGODB_URI=mongodb+srv://...
MONGODB_DB=kavana_apartaments
```

## Backup y Compliance

- **PITR (Point-in-Time Recovery)**: Habilitado en Atlas (continuous backup)
- **Audit log**: 7 años retención (time-series, inmutable)
- **Episodic memory**: 1 año retención
- **Chat messages**: 2 años retención
- **Network access**: Restringir a IPs Vercel, Render, oficina

## Troubleshooting

### Error: "Vector search requires M10+ cluster"
→ Upgrade cluster a M10 o superior en Atlas

### Error: "Time series collections require MongoDB 5.0+"
→ Verificar versión MongoDB del cluster (Atlas usa 6.0+ por defecto)

### Seed falla con "js-yaml not found"
→ `cd tools/mongodb && npm install`

### Vector search no retorna resultados
→ Verificar que el índice `vector_index` esté ACTIVO en Atlas UI (puede tardar minutos en build)
→ Verificar que `embedding` tenga 1536 dimensiones exactas