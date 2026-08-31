/**
 * MongoDB Atlas Seed Script for Kavana Viability Executive
 * 
 * Populates the database with fixture data from fixtures/companies/kavana-viability-executive/
 * 
 * Run: mongosh "mongodb+srv://<cluster>.mongodb.net/kavana_apartaments" --file seed.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ============================================================
// LOAD FIXTURE DATA
// ============================================================

const fixtureDir = '/root/kavana-apartaments/fixtures/companies/kavana-viability-executive';

function loadYaml(file) {
  const content = fs.readFileSync(path.join(fixtureDir, file), 'utf8');
  return yaml.load(content);
}

function loadMarkdown(file) {
  return fs.readFileSync(path.join(fixtureDir, file), 'utf8');
}

const profile = loadYaml('profile.yaml');
const people = loadYaml('people.yaml');
const departments = loadYaml('departments.yaml');
const promociones = loadYaml('docs/promociones.yaml');
const escenarios = loadYaml('docs/escenarios.yaml');
const conocimiento = loadMarkdown('docs/conocimiento_corporativo.md');
const episodic = loadYaml('memory/episodic.yaml');

const companyId = 'kavana_viability_executive';
const now = new Date();

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function chunkText(text, maxTokens = 500, overlap = 50) {
  // Simple token estimation: ~4 chars per token for Spanish
  const maxChars = maxTokens * 4;
  const overlapChars = overlap * 4;
  const chunks = [];
  
  for (let i = 0; i < text.length; i += maxChars - overlapChars) {
    chunks.push(text.slice(i, i + maxChars));
  }
  
  return chunks;
}

// Mock embedding function (replace with actual OpenAI API call)
function mockEmbedding(text) {
  // Return a deterministic pseudo-embedding for testing
  const hash = Array.from(text).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const embedding = new Array(1536).fill(0).map((_, i) => 
    Math.sin((hash + i) * 0.01) * 0.5 + Math.cos((hash + i) * 0.007) * 0.5
  );
  // Normalize
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / norm);
}

// ============================================================
// SEED FUNCTIONS
// ============================================================

async function seedCompanies() {
  const doc = {
    companyId,
    name: profile.name,
    slug: profile.id,
    legalName: profile.legal_name,
    tagline: profile.tagline,
    description: profile.description,
    mission: profile.mission,
    vision: profile.vision,
    values: profile.values,
    stage: profile.stage,
    industry: profile.industry,
    headcount: profile.headcount,
    arr_eur: profile.arr_eur,
    monthly_burn_eur: profile.monthly_burn_eur,
    runway_months: profile.runway_months,
    locations: profile.locations,
    key_metrics: profile.key_metrics,
    competitors: profile.competitors,
    strategic_priorities: profile.strategic_priorities_2025,
    risk_factors: profile.risk_factors,
    culture_keywords: profile.culture_keywords,
    settings: {
      currency: 'EUR',
      timezone: 'Europe/Madrid',
      language: 'es',
      fiscal_year_start: '01-01'
    },
    createdAt: new Date('2019-03-15'),
    updatedAt: now
  };
  
  await db.companies.replaceOne({ companyId }, doc, { upsert: true });
  print('✓ Seeded companies');
}

async function seedPromotions() {
  const bulk = db.promotions.initializeUnorderedBulkOp();
  
  for (const promo of promociones.promotions) {
    const doc = {
      promotionId: promo.id,
      companyId,
      name: promo.name,
      slug: promo.id.replace('promo-', ''),
      status: promo.status,
      progress_pct: promo.progress_pct,
      location: {
        city: promo.location.city,
        province: promo.location.province,
        autonomous_community: promo.location.autonomous_community || 'Comunitat Valenciana',
        country: promo.location.country || 'España',
        address: promo.location.address,
        coordinates: promo.location.coordinates
      },
      dates: {
        start_date: new Date(promo.start_date),
        estimated_delivery: new Date(promo.estimated_delivery),
        license_date: promo.license_date ? new Date(promo.license_date) : null,
        construction_start: promo.construction_start ? new Date(promo.construction_start) : null
      },
      units: {
        total: promo.units_total,
        sold: promo.units_sold,
        available: promo.units_available,
        reserved: 0, // Would need separate tracking
        by_type: promo.unit_types
      },
      financials: promo.financials,
      financing: promo.financing,
      jefe_proyecto: promo.jefe_proyecto,
      critical_path: promo.critical_path,
      risks: promo.risks,
      certifications: ['Certificación Energética A/B Target'],
      createdAt: new Date(promo.start_date),
      updatedAt: now
    };
    
    bulk.find({ companyId, promotionId: promo.id }).upsert().replaceOne(doc);
  }
  
  await bulk.execute();
  print(`✓ Seeded ${promociones.promotions.length} promotions`);
}

async function seedUsers() {
  const bulk = db.users.initializeUnorderedBulkOp();
  
  // Directivos
  for (const person of people.people) {
    const doc = {
      userId: person.id,
      companyId,
      clerk_id: null, // To be synced from Clerk
      email: person.email,
      first_name: person.name.split(' ')[0],
      last_name: person.name.split(' ').slice(1).join(' '),
      role: person.role.includes('CEO') || person.role.includes('Director') ? 'director' : 
            person.role.includes('Jefe') ? 'jefe_proyecto' : 'analista',
      department: person.department,
      permissions: [],
      avatar_url: null,
      phone: person.phone,
      is_active: true,
      last_login: null,
      createdAt: new Date(person.start_date),
      updatedAt: now
    };
    
    bulk.find({ companyId, userId: person.id }).upsert().replaceOne(doc);
  }
  
  // Jefes de proyecto
  for (const jp of people.jefes_proyecto.members) {
    const doc = {
      userId: jp.id,
      companyId,
      clerk_id: null,
      email: `${jp.name.toLowerCase().replace(' ', '.')}@kavana-viability-executive.com`,
      first_name: jp.name.split(' ')[0],
      last_name: jp.name.split(' ').slice(1).join(' '),
      role: 'jefe_proyecto',
      department: 'Promociones',
      permissions: ['promotions:read', 'promotions:write', 'reports:read'],
      avatar_url: null,
      phone: null,
      is_active: true,
      last_login: null,
      createdAt: now,
      updatedAt: now
    };
    
    bulk.find({ companyId, userId: jp.id }).upsert().replaceOne(doc);
  }
  
  await bulk.execute();
  print(`✓ Seeded ${people.people.length + people.jefes_proyecto.members.length} users`);
}

async function seedScenarios() {
  const bulk = db.scenarios.initializeUnorderedBulkOp();
  
  for (const scenario of escenarios.scenarios) {
    const doc = {
      scenarioId: scenario.id,
      companyId,
      domain: scenario.domain,
      title: scenario.title,
      description: scenario.situation,
      situation: scenario.situation,
      company_context: scenario.company_context,
      options: scenario.options,
      decision_criteria: scenario.decision_criteria,
      recommended: scenario.recommended,
      rationale: scenario.rationale,
      status: scenario.status,
      decided_option: scenario.decided_option || null,
      decided_at: scenario.decided_at ? new Date(scenario.decided_at) : null,
      decided_by: scenario.decided_by || null,
      outcome: scenario.outcome || null,
      tags: scenario.tags,
      createdAt: new Date(scenario.created_at),
      updatedAt: now
    };
    
    bulk.find({ companyId, scenarioId: scenario.id }).upsert().replaceOne(doc);
  }
  
  await bulk.execute();
  print(`✓ Seeded ${escenarios.scenarios.length} scenarios`);
}

async function seedKnowledgeChunks() {
  const bulk = db.knowledge_chunks.initializeUnorderedBulkOp();
  let chunkCount = 0;
  
  // Chunk profile
  const profileText = `
    ${profile.name}: ${profile.tagline}
    ${profile.description}
    Misión: ${profile.mission}
    Visión: ${profile.vision}
    Valores: ${profile.values.join(', ')}
    Etapa: ${profile.stage}
    Sector: ${profile.industry}
    Plantilla: ${profile.headcount} personas
    ARR: ${profile.arr_eur.toLocaleString('es-ES')}€
    Burn mensual: ${profile.monthly_burn_eur.toLocaleString('es-ES')}€
    Runway: ${profile.runway_months} meses
    Ubicaciones: ${profile.locations.headquarters.city}, ${profile.locations.delegations.map(d => d.city).join(', ')}
    Métricas clave: ${JSON.stringify(profile.key_metrics)}
    Competidores: ${profile.competitors.map(c => c.name).join(', ')}
    Prioridades 2025: ${profile.strategic_priorities_2025.join('; ')}
    Riesgos: ${profile.risk_factors.join('; ')}
    Cultura: ${profile.culture_keywords.join(', ')}
  `;
  
  for (const chunk of chunkText(profileText)) {
    bulk.insert({
      chunkId: generateId('chunk'),
      companyId,
      source: 'profile',
      source_id: 'profile',
      title: 'Perfil empresa',
      content: chunk,
      content_tokens: Math.ceil(chunk.length / 4),
      embedding: mockEmbedding(chunk),
      metadata: {
        document_type: 'profile',
        department: 'Dirección General',
        tags: ['empresa', 'estrategia', 'metricas', 'competidores'],
        author: 'jorge-adan',
        version: '1.0'
      },
      createdAt: now,
      updatedAt: now
    });
    chunkCount++;
  }
  
  // Chunk people (each person)
  for (const person of people.people) {
    const personText = `
      ${person.name} - ${person.role}
      ${person.bio}
      Habilidades: ${person.skills.join(', ')}
      Áreas de decisión: ${person.decision_areas.join(', ')}
      Estilo comunicación: ${person.communication_style}
    `;
    
    for (const chunk of chunkText(personText)) {
      bulk.insert({
        chunkId: generateId('chunk'),
        companyId,
        source: 'people',
        source_id: person.id,
        title: `${person.name} - ${person.role}`,
        content: chunk,
        content_tokens: Math.ceil(chunk.length / 4),
        embedding: mockEmbedding(chunk),
        metadata: {
          document_type: 'person',
          department: person.department,
          tags: ['equipo', 'directivo', person.department.toLowerCase()],
          author: 'system',
          version: '1.0'
        },
        createdAt: now,
        updatedAt: now
      });
      chunkCount++;
    }
  }
  
  // Chunk departments
  for (const dept of departments.departments) {
    const deptText = `
      Departamento: ${dept.name} (${dept.id})
      Responsable: ${dept.head}
      ${dept.description}
      Plantilla: ${dept.headcount} personas
      Presupuesto anual: ${dept.budget_eur_year.toLocaleString('es-ES')}€
      Sub-áreas: ${dept.sub_areas?.map(s => s.name).join(', ') || 'N/A'}
      Procesos clave: ${dept.key_processes?.join('; ') || 'N/A'}
      KPIs: ${dept.kpis?.join(', ') || 'N/A'}
    `;
    
    for (const chunk of chunkText(deptText)) {
      bulk.insert({
        chunkId: generateId('chunk'),
        companyId,
        source: 'departments',
        source_id: dept.id,
        title: dept.name,
        content: chunk,
        content_tokens: Math.ceil(chunk.length / 4),
        embedding: mockEmbedding(chunk),
        metadata: {
          document_type: 'department',
          department: dept.name,
          tags: ['departamento', 'organización', 'kpis', 'procesos'],
          author: 'system',
          version: '1.0'
        },
        createdAt: now,
        updatedAt: now
      });
      chunkCount++;
    }
  }
  
  // Chunk promotions
  for (const promo of promociones.promotions) {
    const promoText = `
      Promoción: ${promo.name} (${promo.id})
      Ubicación: ${promo.location.city}, ${promo.location.province}
      Estado: ${promo.status} (${promo.progress_pct}% avance)
      Fechas: Inicio ${promo.start_date}, Entrega estimada ${promo.estimated_delivery}
      Unidades: ${promo.units_total} total, ${promo.units_sold} vendidas, ${promo.units_available} disponibles
      Tipologías: ${promo.unit_types.map(t => `${t.count}x ${t.type} (${t.avg_m2}m², desde ${t.price_from_eur.toLocaleString('es-ES')}€)`).join('; ')}
      Financieros: Suelo ${promo.financials.land_cost_eur.toLocaleString('es-ES')}€, Construcción ${promo.financials.construction_budget_eur.toLocaleString('es-ES')}€ (gastado ${promo.financials.construction_spent_eur.toLocaleString('es-ES')}€), Total ${promo.financials.total_budget_eur.toLocaleString('es-ES')}€
      Revenue contratado: ${promo.financials.revenue_contracted_eur.toLocaleString('es-ES')}€
      Margen proyectado: ${promo.financials.projected_margin_eur.toLocaleString('es-ES')}€ (${promo.financials.projected_margin_pct}%)
      Financiación: ${promo.financing.bank}, ${promo.financing.loan_amount_eur.toLocaleString('es-ES')}€ (${promo.financing.interest_rate})
      Jefe de proyecto: ${promo.jefe_proyecto}
      Ruta crítica: ${promo.critical_path.join(' → ')}
      Riesgos: ${promo.risks.join('; ')}
    `;
    
    for (const chunk of chunkText(promoText)) {
      bulk.insert({
        chunkId: generateId('chunk'),
        companyId,
        source: 'promociones',
        source_id: promo.id,
        title: promo.name,
        content: chunk,
        content_tokens: Math.ceil(chunk.length / 4),
        embedding: mockEmbedding(chunk),
        metadata: {
          document_type: 'promotion',
          department: 'Promociones',
          tags: ['promocion', 'obra', 'ventas', 'financiacion', promo.location.city.toLowerCase()],
          author: promo.jefe_proyecto,
          version: '1.0'
        },
        createdAt: now,
        updatedAt: now
      });
      chunkCount++;
    }
  }
  
  // Chunk scenarios
  for (const scenario of escenarios.scenarios) {
    const scenarioText = `
      Escenario: ${scenario.title} (${scenario.id})
      Dominio: ${scenario.domain}
      Situación: ${scenario.situation}
      Opciones: ${scenario.options.map(o => `${o.id}: ${o.label} - ${o.description}`).join(' | ')}
      Criterios decisión: ${scenario.decision_criteria.join(', ')}
      Recomendación: ${scenario.recommended} (${scenario.options.find(o => o.id === scenario.recommended)?.label})
      Rationale: ${scenario.rationale}
      Tags: ${scenario.tags.join(', ')}
    `;
    
    for (const chunk of chunkText(scenarioText)) {
      bulk.insert({
        chunkId: generateId('chunk'),
        companyId,
        source: 'escenarios',
        source_id: scenario.id,
        title: scenario.title,
        content: chunk,
        content_tokens: Math.ceil(chunk.length / 4),
        embedding: mockEmbedding(chunk),
        metadata: {
          document_type: 'scenario',
          department: scenario.domain,
          tags: ['escenario', 'decision', scenario.domain, ...scenario.tags],
          author: scenario.created_by,
          version: '1.0'
        },
        createdAt: new Date(scenario.created_at),
        updatedAt: now
      });
      chunkCount++;
    }
  }
  
  // Chunk conocimiento corporativo (by sections)
  const conocimientoSections = conocimiento.split('## ').filter(s => s.trim());
  for (const section of conocimientoSections) {
    const lines = section.trim().split('\n');
    const title = lines[0];
    const content = lines.slice(1).join('\n');
    
    if (content.length > 100) {
      for (const chunk of chunkText(content, 800, 100)) {
        bulk.insert({
          chunkId: generateId('chunk'),
          companyId,
          source: 'conocimiento_corporativo',
          source_id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title: `Conocimiento: ${title}`,
          content: chunk,
          content_tokens: Math.ceil(chunk.length / 4),
          embedding: mockEmbedding(chunk),
          metadata: {
            document_type: 'knowledge_base',
            department: 'Corporativo',
            tags: ['conocimiento', 'normativa', 'procesos', 'glosario', 'kpis'],
            author: 'system',
            version: '1.0'
          },
          createdAt: now,
          updatedAt: now
        });
        chunkCount++;
      }
    }
  }
  
  // Chunk episodic memory
  for (const mem of episodic.episodic_memory) {
    const memText = `
      ${mem.type.toUpperCase()}: ${mem.title} (${mem.date})
      ${mem.summary || ''}
      ${mem.participants ? `Participantes: ${mem.participants.join(', ')}` : ''}
      ${mem.decision ? `Decisión: ${mem.decision}` : ''}
      ${mem.outcome ? `Resultado: ${mem.outcome}` : ''}
      ${mem.rationale ? `Rationale: ${mem.rationale}` : ''}
      Tags: ${mem.tags.join(', ')}
    `;
    
    for (const chunk of chunkText(memText)) {
      bulk.insert({
        chunkId: generateId('chunk'),
        companyId,
        source: 'episodic_memory',
        source_id: mem.id,
        title: mem.title,
        content: chunk,
        content_tokens: Math.ceil(chunk.length / 4),
        embedding: mockEmbedding(chunk),
        metadata: {
          document_type: 'memory',
          department: 'Dirección General',
          tags: ['memoria', 'decision', 'hito', ...mem.tags],
          author: mem.participants?.[0] || 'system',
          version: '1.0'
        },
        createdAt: new Date(mem.date),
        updatedAt: now
      });
      chunkCount++;
    }
  }
  
  await bulk.execute();
  print(`✓ Seeded ${chunkCount} knowledge chunks`);
}

async function seedEpisodicMemory() {
  const bulk = db.episodic_memory.initializeUnorderedBulkOp();
  
  for (const mem of episodic.episodic_memory) {
    const doc = {
      companyId,
      type: mem.type,
      title: mem.title,
      summary: mem.summary,
      participants: mem.participants || [],
      scenario_ref: mem.scenario_ref || null,
      decision: mem.decision || null,
      outcome: mem.outcome || null,
      rationale: mem.rationale || null,
      tags: mem.tags || [],
      metadata: {
        promotionId: mem.tags?.find(t => t.startsWith('promo-')) || null,
        scenarioId: mem.scenario_ref || null
      },
      timestamp: new Date(mem.date)
    };
    
    bulk.find({ companyId, timestamp: new Date(mem.date), title: mem.title }).upsert().replaceOne(doc);
  }
  
  await bulk.execute();
  print(`✓ Seeded ${episodic.episodic_memory.length} episodic memories`);
}

// ============================================================
// MAIN
// ============================================================

print('=== SEEDING KAVANA APARTAMENTS ===');
print(`Company ID: ${companyId}`);
print(`Timestamp: ${now.toISOString()}`);
print('');

await seedCompanies();
await seedPromotions();
await seedUsers();
await seedScenarios();
await seedKnowledgeChunks();
await seedEpisodicMemory();

print('');
print('=== SEEDING COMPLETE ===');
print('Verify with:');
print('  db.companies.findOne({companyId: "kavana_viability_executive"})');
print('  db.promotions.countDocuments({companyId: "kavana_viability_executive"})');
print('  db.knowledge_chunks.countDocuments({companyId: "kavana_viability_executive"})');
print('  db.episodic_memory.countDocuments({companyId: "kavana_viability_executive"})');