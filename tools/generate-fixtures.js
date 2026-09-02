const yaml = require('js-yaml');
const fs = require('fs');

const yamlPath = './fixtures/companies/kavana-viability-executive/docs/promociones.yaml';
const jsonPath = './apps/web/src/assets/fixtures/promotions.json';

try {
  const doc = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
  
  if (doc && doc.promotions) {
    const promotions = doc.promotions.map(promo => ({
      id: promo.id,
      name: promo.name,
      status: promo.status,
      progress_pct: promo.progress_pct,
      start_date: promo.start_date,
      estimated_delivery: promo.estimated_delivery,
      units_total: promo.units_total,
      units_sold: promo.units_sold,
      units_available: promo.units_available,
      location: promo.location,
      unit_types: promo.unit_types,
      financials: promo.financials,
      financing: promo.financing,
      jefe_proyecto: promo.jefe_proyecto,
      critical_path: promo.critical_path,
      risks: promo.risks
    }));
    
    fs.writeFileSync(jsonPath, JSON.stringify(promotions, null, 2));
    console.log(`Generated ${promotions.length} promotions in ${jsonPath}`);
  } else {
    console.error('No promotions found in YAML');
  }
} catch (e) {
  console.error('Error processing YAML:', e);
}