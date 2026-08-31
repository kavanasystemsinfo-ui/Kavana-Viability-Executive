/**
 * MongoDB Atlas Setup Script for Kavana Viability Executive
 * 
 * Run this script in MongoDB Atlas Shell or via mongosh:
 * mongosh "mongodb+srv://<cluster>.mongodb.net/kavana_apartaments" --file setup.js
 * 
 * Requires: MongoDB 6.0+ (for time series collections and vector search)
 * Atlas tier: M10+ (for Atlas Vector Search)
 */

// ============================================================
// DATABASE AND COLLECTIONS SETUP
// ============================================================

const dbName = 'kavana_apartaments';
db = db.getSiblingDB(dbName);

// Helper function to create collection with validation
function createCollection(name, validator, indexes = []) {
  try {
    db.createCollection(name, { validator: { $jsonSchema: validator } });
    print(`✓ Created collection: ${name}`);
  } catch (e) {
    if (e.codeName === 'NamespaceExists') {
      print(`⚠ Collection already exists: ${name}`);
      // Update validator
      try {
        db.runCommand({ collMod: name, validator: { $jsonSchema: validator } });
        print(`  ↳ Updated validator`);
      } catch (e2) {
        print(`  ✗ Failed to update validator: ${e2.message}`);
      }
    } else {
      print(`✗ Error creating ${name}: ${e.message}`);
    }
  }
  
  // Create indexes
  indexes.forEach(idx => {
    try {
      db[name].createIndex(idx.keys, idx.options || {});
      print(`  ↳ Index: ${JSON.stringify(idx.keys)}`);
    } catch (e) {
      if (e.codeName !== 'IndexOptionsConflict') {
        print(`  ✗ Index error: ${e.message}`);
      }
    }
  });
}

// ============================================================
// 1. COMPANIES COLLECTION
// ============================================================
createCollection('companies', {
  bsonType: 'object',
  required: ['companyId', 'name', 'slug', 'createdAt'],
  properties: {
    companyId: { bsonType: 'string', description: 'Unique identifier (UUID)' },
    name: { bsonType: 'string' },
    slug: { bsonType: 'string', pattern: '^[a-z0-9-]+$' },
    legalName: { bsonType: 'string' },
    tagline: { bsonType: 'string' },
    description: { bsonType: 'string' },
    mission: { bsonType: 'string' },
    vision: { bsonType: 'string' },
    values: { bsonType: 'array', items: { bsonType: 'string' } },
    stage: { bsonType: 'string', enum: ['Startup', 'Growth', 'Established', 'Mature'] },
    industry: { bsonType: 'string' },
    headcount: { bsonType: 'int', minimum: 0 },
    arr_eur: { bsonType: 'double', minimum: 0 },
    monthly_burn_eur: { bsonType: 'double', minimum: 0 },
    runway_months: { bsonType: 'int', minimum: 0 },
    locations: { bsonType: 'object' },
    key_metrics: { bsonType: 'object' },
    competitors: { bsonType: 'array' },
    strategic_priorities: { bsonType: 'array', items: { bsonType: 'string' } },
    risk_factors: { bsonType: 'array', items: { bsonType: 'string' } },
    culture_keywords: { bsonType: 'array', items: { bsonType: 'string' } },
    settings: { bsonType: 'object' },
    createdAt: { bsonType: 'date' },
    updatedAt: { bsonType: 'date' }
  }
}, [
  { keys: { companyId: 1 }, options: { unique: true } },
  { keys: { slug: 1 }, options: { unique: true } },
  { keys: { createdAt: -1 } }
]);

// ============================================================
// 2. PROMOTIONS COLLECTION (with geospatial)
// ============================================================
createCollection('promotions', {
  bsonType: 'object',
  required: ['promotionId', 'companyId', 'name', 'status', 'location', 'createdAt'],
  properties: {
    promotionId: { bsonType: 'string' },
    companyId: { bsonType: 'string' },
    name: { bsonType: 'string' },
    slug: { bsonType: 'string' },
    status: { 
      bsonType: 'string', 
      enum: ['Due Diligence', 'Opción Suelo', 'Proyecto/Licencia', 'Pre-comercialización', 'Ejecución', 'Entrega', 'Postventa', 'Cerrada'] 
    },
    progress_pct: { bsonType: 'int', minimum: 0, maximum: 100 },
    location: {
      bsonType: 'object',
      required: ['city', 'province', 'coordinates'],
      properties: {
        city: { bsonType: 'string' },
        province: { bsonType: 'string' },
        autonomous_community: { bsonType: 'string' },
        country: { bsonType: 'string' },
        address: { bsonType: 'string' },
        coordinates: {
          bsonType: 'array',
          minItems: 2,
          maxItems: 2,
          items: { bsonType: 'double' }
        }
      }
    },
    dates: {
      bsonType: 'object',
      properties: {
        start_date: { bsonType: 'date' },
        estimated_delivery: { bsonType: 'date' },
        actual_delivery: { bsonType: 'date' },
        license_date: { bsonType: 'date' },
        construction_start: { bsonType: 'date' }
      }
    },
    units: {
      bsonType: 'object',
      required: ['total', 'sold', 'available', 'reserved'],
      properties: {
        total: { bsonType: 'int', minimum: 0 },
        sold: { bsonType: 'int', minimum: 0 },
        available: { bsonType: 'int', minimum: 0 },
        reserved: { bsonType: 'int', minimum: 0 },
        by_type: { bsonType: 'array' }
      }
    },
    financials: {
      bsonType: 'object',
      properties: {
        land_cost_eur: { bsonType: 'double', minimum: 0 },
        construction_budget_eur: { bsonType: 'double', minimum: 0 },
        construction_spent_eur: { bsonType: 'double', minimum: 0 },
        total_budget_eur: { bsonType: 'double', minimum: 0 },
        revenue_contracted_eur: { bsonType: 'double', minimum: 0 },
        projected_margin_eur: { bsonType: 'double' },
        projected_margin_pct: { bsonType: 'double' }
      }
    },
    financing: {
      bsonType: 'object',
      properties: {
        bank: { bsonType: 'string' },
        loan_amount_eur: { bsonType: 'double', minimum: 0 },
        drawn_eur: { bsonType: 'double', minimum: 0 },
        interest_rate: { bsonType: 'string' },
        maturity: { bsonType: 'date' },
        ltv_pct: { bsonType: 'double' },
        dscr: { bsonType: 'double' }
      }
    },
    jefe_proyecto: { bsonType: 'string' },
    critical_path: { bsonType: 'array', items: { bsonType: 'string' } },
    risks: { bsonType: 'array', items: { bsonType: 'string' } },
    certifications: { bsonType: 'array' },
    createdAt: { bsonType: 'date' },
    updatedAt: { bsonType: 'date' }
  }
}, [
  { keys: { companyId: 1, promotionId: 1 }, options: { unique: true } },
  { keys: { companyId: 1, status: 1 } },
  { keys: { 'location.coordinates': '2dsphere' } }, // Geospatial index
  { keys: { companyId: 1, 'dates.estimated_delivery': 1 } },
  { keys: { jefe_proyecto: 1 } }
]);

// ============================================================
// 3. USERS COLLECTION (synced from Clerk)
// ============================================================
createCollection('users', {
  bsonType: 'object',
  required: ['userId', 'companyId', 'email', 'role', 'createdAt'],
  properties: {
    userId: { bsonType: 'string' }, // Clerk user ID
    companyId: { bsonType: 'string' },
    clerk_id: { bsonType: 'string' },
    email: { bsonType: 'string', pattern: '^.+@.+\\..+$' },
    first_name: { bsonType: 'string' },
    last_name: { bsonType: 'string' },
    role: { 
      bsonType: 'string', 
      enum: ['super_admin', 'admin', 'director', 'jefe_proyecto', 'analista', 'comercial', 'viewer'] 
    },
    department: { bsonType: 'string' },
    permissions: { bsonType: 'array', items: { bsonType: 'string' } },
    avatar_url: { bsonType: 'string' },
    phone: { bsonType: 'string' },
    is_active: { bsonType: 'bool' },
    last_login: { bsonType: 'date' },
    createdAt: { bsonType: 'date' },
    updatedAt: { bsonType: 'date' }
  }
}, [
  { keys: { userId: 1 }, options: { unique: true } },
  { keys: { clerk_id: 1 }, options: { unique: true, sparse: true } },
  { keys: { companyId: 1, role: 1 } },
  { keys: { companyId: 1, email: 1 }, options: { unique: true } },
  { keys: { companyId: 1, is_active: 1 } }
]);

// ============================================================
// 4. KNOWLEDGE CHUNKS COLLECTION (RAG - Vector Search)
// ============================================================
createCollection('knowledge_chunks', {
  bsonType: 'object',
  required: ['chunkId', 'companyId', 'source', 'content', 'embedding', 'createdAt'],
  properties: {
    chunkId: { bsonType: 'string' },
    companyId: { bsonType: 'string' },
    source: { 
      bsonType: 'string', 
      enum: ['profile', 'people', 'departments', 'promociones', 'escenarios', 'conocimiento_corporativo', 'episodic_memory', 'web', 'document'] 
    },
    source_id: { bsonType: 'string' }, // e.g., promotionId, scenarioId, docId
    title: { bsonType: 'string' },
    content: { bsonType: 'string' },
    content_tokens: { bsonType: 'int', minimum: 0 },
    embedding: { 
      bsonType: 'array', 
      items: { bsonType: 'double' },
      description: 'Vector embedding (1536 dims for text-embedding-3-small)'
    },
    metadata: {
      bsonType: 'object',
      properties: {
        document_type: { bsonType: 'string' },
        department: { bsonType: 'string' },
        tags: { bsonType: 'array', items: { bsonType: 'string' } },
        effective_date: { bsonType: 'date' },
        expiry_date: { bsonType: 'date' },
        author: { bsonType: 'string' },
        version: { bsonType: 'string' }
      }
    },
    createdAt: { bsonType: 'date' },
    updatedAt: { bsonType: 'date' }
  }
}, [
  { keys: { companyId: 1, source: 1 } },
  { keys: { companyId: 1, source_id: 1 } },
  { keys: { companyId: 1, 'metadata.tags': 1 } },
  { keys: { createdAt: -1 } },
  // Vector search index created separately via Atlas UI/API
  // { keys: { embedding: 'vector' }, options: { vectorOptions: { type: 'vector', dimensions: 1536, similarity: 'cosine' } } }
]);

// ============================================================
// 5. EPISODIC MEMORY COLLECTION (Time Series)
// ============================================================
try {
  db.createCollection('episodic_memory', {
    timeseries: {
      timeField: 'timestamp',
      metaField: 'companyId',
      granularity: 'hours'
    },
    expireAfterSeconds: 365 * 24 * 60 * 60 // 1 year TTL
  });
  print('✓ Created time-series collection: episodic_memory');
} catch (e) {
  if (e.codeName === 'NamespaceExists') {
    print('⚠ Collection already exists: episodic_memory');
  } else {
    print(`✗ Error: ${e.message}`);
  }
}

db.episodic_memory.createIndex({ companyId: 1, timestamp: -1 });
db.episodic_memory.createIndex({ companyId: 1, type: 1, timestamp: -1 });
db.episodic_memory.createIndex({ companyId: 1, 'metadata.promotionId': 1, timestamp: -1 });
db.episodic_memory.createIndex({ companyId: 1, 'metadata.scenarioId': 1, timestamp: -1 });
print('  ↳ Indexes created for episodic_memory');

// ============================================================
// 6. AUDIT LOG COLLECTION (Time Series - Immutable)
// ============================================================
try {
  db.createCollection('audit_log', {
    timeseries: {
      timeField: 'timestamp',
      metaField: 'companyId',
      granularity: 'minutes'
    },
    expireAfterSeconds: 7 * 365 * 24 * 60 * 60 // 7 years TTL (compliance)
  });
  print('✓ Created time-series collection: audit_log');
} catch (e) {
  if (e.codeName === 'NamespaceExists') {
    print('⚠ Collection already exists: audit_log');
  } else {
    print(`✗ Error: ${e.message}`);
  }
}

db.audit_log.createIndex({ companyId: 1, timestamp: -1 });
db.audit_log.createIndex({ companyId: 1, entity_type: 1, entity_id: 1, timestamp: -1 });
db.audit_log.createIndex({ companyId: 1, user_id: 1, timestamp: -1 });
db.audit_log.createIndex({ companyId: 1, action: 1, timestamp: -1 });
print('  ↳ Indexes created for audit_log');

// ============================================================
// 7. ALERTS COLLECTION
// ============================================================
createCollection('alerts', {
  bsonType: 'object',
  required: ['alertId', 'companyId', 'type', 'severity', 'status', 'title', 'createdAt'],
  properties: {
    alertId: { bsonType: 'string' },
    companyId: { bsonType: 'string' },
    type: { 
      bsonType: 'string', 
      enum: ['budget_deviation', 'schedule_delay', 'cash_flow', 'license_risk', 'sales_velocity', 'compliance', 'quality', 'custom'] 
    },
    severity: { bsonType: 'string', enum: ['info', 'warning', 'critical', 'urgent'] },
    status: { bsonType: 'string', enum: ['open', 'acknowledged', 'in_progress', 'resolved', 'dismissed'] },
    title: { bsonType: 'string' },
    description: { bsonType: 'string' },
    entity_type: { bsonType: 'string' }, // promotion, company, user, etc.
    entity_id: { bsonType: 'string' },
    metric_value: { bsonType: 'double' },
    threshold_value: { bsonType: 'double' },
    assignee: { bsonType: 'string' }, // userId
    acknowledged_at: { bsonType: 'date' },
    resolved_at: { bsonType: 'date' },
    resolved_by: { bsonType: 'string' },
    resolution_notes: { bsonType: 'string' },
    metadata: { bsonType: 'object' },
    createdAt: { bsonType: 'date' },
    updatedAt: { bsonType: 'date' }
  }
}, [
  { keys: { companyId: 1, status: 1, severity: -1, createdAt: -1 } },
  { keys: { companyId: 1, entity_type: 1, entity_id: 1, status: 1 } },
  { keys: { assignee: 1, status: 1 } },
  { keys: { createdAt: -1 } }
]);

// ============================================================
// 8. SCENARIOS COLLECTION (Decision scenarios)
// ============================================================
createCollection('scenarios', {
  bsonType: 'object',
  required: ['scenarioId', 'companyId', 'domain', 'title', 'status', 'createdAt'],
  properties: {
    scenarioId: { bsonType: 'string' },
    companyId: { bsonType: 'string' },
    domain: { bsonType: 'string', enum: ['strategy', 'finance', 'operations', 'commercial', 'legal', 'technical', 'hr'] },
    title: { bsonType: 'string' },
    description: { bsonType: 'string' },
    situation: { bsonType: 'string' },
    company_context: { bsonType: 'object' },
    options: { bsonType: 'array' },
    decision_criteria: { bsonType: 'array', items: { bsonType: 'string' } },
    recommended: { bsonType: 'string' },
    rationale: { bsonType: 'string' },
    status: { bsonType: 'string', enum: ['draft', 'active', 'decided', 'archived'] },
    decided_option: { bsonType: 'string' },
    decided_at: { bsonType: 'date' },
    decided_by: { bsonType: 'string' },
    outcome: { bsonType: 'string' },
    tags: { bsonType: 'array', items: { bsonType: 'string' } },
    createdAt: { bsonType: 'date' },
    updatedAt: { bsonType: 'date' }
  }
}, [
  { keys: { companyId: 1, scenarioId: 1 }, options: { unique: true } },
  { keys: { companyId: 1, domain: 1, status: 1 } },
  { keys: { companyId: 1, status: 1, createdAt: -1 } },
  { keys: { tags: 1 } }
]);

// ============================================================
// 9. CHAT SESSIONS COLLECTION (Executive chat history)
// ============================================================
createCollection('chat_sessions', {
  bsonType: 'object',
  required: ['sessionId', 'companyId', 'userId', 'createdAt'],
  properties: {
    sessionId: { bsonType: 'string' },
    companyId: { bsonType: 'string' },
    userId: { bsonType: 'string' },
    title: { bsonType: 'string' },
    status: { bsonType: 'string', enum: ['active', 'archived', 'deleted'] },
    agent_mode: { bsonType: 'string', enum: ['executive', 'cso', 'cfo', 'coo', 'clo', 'cmo', 'cpo', 'board'] },
    context: { bsonType: 'object' }, // Active promotions, filters, etc.
    message_count: { bsonType: 'int', minimum: 0 },
    token_usage: { bsonType: 'object' },
    createdAt: { bsonType: 'date' },
    updatedAt: { bsonType: 'date' },
    endedAt: { bsonType: 'date' }
  }
}, [
  { keys: { companyId: 1, userId: 1, createdAt: -1 } },
  { keys: { sessionId: 1 }, options: { unique: true } },
  { keys: { companyId: 1, status: 1 } }
]);

// ============================================================
// 10. CHAT MESSAGES COLLECTION (Time Series)
// ============================================================
try {
  db.createCollection('chat_messages', {
    timeseries: {
      timeField: 'timestamp',
      metaField: 'sessionId',
      granularity: 'seconds'
    },
    expireAfterSeconds: 2 * 365 * 24 * 60 * 60 // 2 years TTL
  });
  print('✓ Created time-series collection: chat_messages');
} catch (e) {
  if (e.codeName === 'NamespaceExists') {
    print('⚠ Collection already exists: chat_messages');
  } else {
    print(`✗ Error: ${e.message}`);
  }
}

db.chat_messages.createIndex({ sessionId: 1, timestamp: 1 });
db.chat_messages.createIndex({ companyId: 1, timestamp: -1 });
print('  ↳ Indexes created for chat_messages');

// ============================================================
// 11. AGENT RUNS COLLECTION (Agent execution traces)
// ============================================================
createCollection('agent_runs', {
  bsonType: 'object',
  required: ['runId', 'companyId', 'agent_type', 'status', 'startedAt'],
  properties: {
    runId: { bsonType: 'string' },
    companyId: { bsonType: 'string' },
    sessionId: { bsonType: 'string' },
    agent_type: { 
      bsonType: 'string', 
      enum: ['executive', 'cso', 'cfo', 'coo', 'clo', 'cmo', 'cpo', 'board', 'viability', 'rag'] 
    },
    status: { bsonType: 'string', enum: ['running', 'completed', 'failed', 'cancelled', 'streaming'] },
    input: { bsonType: 'object' },
    output: { bsonType: 'object' },
    tokens: { bsonType: 'object' },
    duration_ms: { bsonType: 'long' },
    error: { bsonType: 'string' },
    trace: { bsonType: 'array' }, // Step-by-step execution trace
    startedAt: { bsonType: 'date' },
    completedAt: { bsonType: 'date' }
  }
}, [
  { keys: { companyId: 1, sessionId: 1, startedAt: -1 } },
  { keys: { runId: 1 }, options: { unique: true } },
  { keys: { companyId: 1, agent_type: 1, status: 1 } }
]);

// ============================================================
// 12. VIABILITY RUNS COLLECTION (Engine calculations)
// ============================================================
createCollection('viability_runs', {
  bsonType: 'object',
  required: ['runId', 'companyId', 'promotionId', 'status', 'createdAt'],
  properties: {
    runId: { bsonType: 'string' },
    companyId: { bsonType: 'string' },
    promotionId: { bsonType: 'string' },
    scenario_name: { bsonType: 'string' }, // base, optimistic, pessimistic, custom
    inputs: { bsonType: 'object' }, // All input parameters
    outputs: { bsonType: 'object' }, // All calculated metrics
    cashflow: { bsonType: 'array' }, // Monthly cashflow projection
    sensitivity: { bsonType: 'array' }, // Sensitivity analysis results
    status: { bsonType: 'string', enum: ['draft', 'running', 'completed', 'failed'] },
    version: { bsonType: 'int', minimum: 1 },
    parent_run_id: { bsonType: 'string' }, // For versioning
    created_by: { bsonType: 'string' },
    createdAt: { bsonType: 'date' },
    updatedAt: { bsonType: 'date' }
  }
}, [
  { keys: { companyId: 1, promotionId: 1, createdAt: -1 } },
  { keys: { runId: 1 }, options: { unique: true } },
  { keys: { companyId: 1, status: 1 } }
]);

// ============================================================
// SUMMARY
// ============================================================
print('\n=== SETUP COMPLETE ===');
print('Collections created:');
print('  1. companies - Company profiles');
print('  2. promotions - Promociones with geospatial index');
print('  3. users - Synced from Clerk');
print('  4. knowledge_chunks - RAG documents (vector search ready)');
print('  5. episodic_memory - Time-series (1yr TTL)');
print('  6. audit_log - Time-series (7yr TTL, compliance)');
print('  7. alerts - Proactive notifications');
print('  8. scenarios - Decision scenarios (MBA style)');
print('  9. chat_sessions - Executive chat history');
print('  10. chat_messages - Time-series messages (2yr TTL)');
print('  11. agent_runs - Agent execution traces');
print('  12. viability_runs - Engine calculation history');

print('\n=== NEXT STEPS ===');
print('1. Create Atlas Vector Search index on knowledge_chunks.embedding');
print('   - Name: vector_index');
print('   - Type: vector');
print('   - Dimensions: 1536');
print('   - Similarity: cosine');
print('   - Filter fields: companyId, source, metadata.tags');
print('');
print('2. Create Atlas Search index on knowledge_chunks.content for hybrid search');
print('');
print('3. Configure database triggers for:');
print('   - users: sync from Clerk webhook');
print('   - promotions: auto-generate alerts on threshold breach');
print('   - audit_log: auto-populate on all collection changes');
print('');
print('4. Set up backup policy: continuous backup (PITR) enabled');
print('5. Configure network access: Vercel/Render IPs + office IP');