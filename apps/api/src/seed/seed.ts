/**
 * Seed de promociones para la API de Kavana Viability Executive.
 * Script CLI standalone: los console.log son la salida del script (no es un
 * módulo de la aplicación), por eso se desactiva no-console localmente.
 */
/* eslint-disable no-console */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as mongoose from 'mongoose';
import type { Model, UpdateQuery } from 'mongoose';
import { load } from 'js-yaml';
import { DEFAULT_COMPANY_ID } from '../auth/company-id.constants';
import { Promotion, PromotionSchema } from '../viability/promotion.schema';

interface YamlUnitType {
  type: string;
  count: number;
  avg_m2: number;
  price_from_eur: number;
}

interface YamlFinancials {
  land_cost_eur: number;
  construction_budget_eur: number;
  construction_spent_eur?: number;
  total_budget_eur: number;
  revenue_contracted_eur: number;
  projected_margin_eur?: number;
  projected_margin_pct?: number;
}

interface YamlFinancing {
  bank?: string;
  loan_amount_eur?: number;
  drawn_eur?: number;
  interest_rate?: string;
  maturity?: string;
}

interface YamlPromocion {
  id: string;
  name: string;
  location?: { city?: string; province?: string; coordinates?: number[]; address?: string };
  status?: string;
  progress_pct?: number;
  start_date?: string;
  estimated_delivery?: string;
  units_total: number;
  units_sold?: number;
  units_available?: number;
  unit_types: YamlUnitType[];
  financials: YamlFinancials;
  financing?: YamlFinancing;
  jefe_proyecto?: string;
  critical_path?: string[];
  risks?: string[];
}

function yamlToPromotionDoc(y: YamlPromocion) {
  return {
    companyId: DEFAULT_COMPANY_ID,
    promotionId: y.id,
    name: y.name,
    ...(y.location ? { location: y.location } : {}),
    ...(y.status ? { status: y.status } : {}),
    ...(y.progress_pct !== undefined ? { progressPct: y.progress_pct } : {}),
    ...(y.start_date ? { startDate: y.start_date } : {}),
    ...(y.estimated_delivery ? { estimatedDelivery: y.estimated_delivery } : {}),
    unitsTotal: y.units_total,
    ...(y.units_sold !== undefined ? { unitsSold: y.units_sold } : {}),
    ...(y.units_available !== undefined ? { unitsAvailable: y.units_available } : {}),
    unitTypes: y.unit_types.map((u) => ({
      type: u.type,
      count: u.count,
      avgM2: u.avg_m2,
      priceFromEur: u.price_from_eur,
    })),
    financials: {
      landCostEur: y.financials.land_cost_eur,
      constructionBudgetEur: y.financials.construction_budget_eur,
      ...(y.financials.construction_spent_eur !== undefined
        ? { constructionSpentEur: y.financials.construction_spent_eur }
        : {}),
      totalBudgetEur: y.financials.total_budget_eur,
      revenueContractedEur: y.financials.revenue_contracted_eur,
      ...(y.financials.projected_margin_eur !== undefined
        ? { projectedMarginEur: y.financials.projected_margin_eur }
        : {}),
      ...(y.financials.projected_margin_pct !== undefined
        ? { projectedMarginPct: y.financials.projected_margin_pct }
        : {}),
    },
    ...(y.financing ? { financing: y.financing } : {}),
    ...(y.jefe_proyecto ? { jefeProyecto: y.jefe_proyecto } : {}),
    ...(y.critical_path ? { criticalPath: y.critical_path } : {}),
    ...(y.risks ? { risks: y.risks } : {}),
  };
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Falta MONGODB_URI. Ejecuta con --env-file=apps/api/.env');
    process.exit(1);
  }
  const dbName = process.env.MONGODB_DB ?? 'kavana_apartaments';

  await mongoose.connect(uri, { dbName });

  // Evita OverwriteModelError si el modelo ya quedó registrado en el proceso.
  // Tipado explícito: mongoose.models[] devuelve Model<any> y el union con el
  // modelo tipado rompería la resolución de overloads de updateOne.
  const PromotionModel: Model<Promotion> =
    (mongoose.models[Promotion.name] as Model<Promotion> | undefined) ??
    mongoose.model<Promotion>(Promotion.name, PromotionSchema);

  const yamlPath = join(
    __dirname,
    '../../../../fixtures/companies/kavana-viability-executive/docs/promociones.yaml',
  );
  const raw = readFileSync(yamlPath, 'utf8');
  const data = load(raw) as { promotions: YamlPromocion[] };
  const docs = data.promotions.map(yamlToPromotionDoc);

  // Idempotente: upsert por (companyId, promotionId). Se usa updateOne en bucle
  // (6 promociones) en lugar de bulkWrite porque el overload de tipos de
  // bulkWrite no unifica con exactOptionalPropertyTypes.
  let insertadas = 0;
  let actualizadas = 0;
  for (const d of docs) {
    // Cast necesario: los overloads de updateOne de mongoose no unifican el $set
    // de un objeto plano con exactOptionalPropertyTypes (mongoose espera paths
    // del documento hydrated). Los campos de d son exactamente los paths del
    // schema, por lo que el cast es inocuo en runtime.
    const res = await PromotionModel.updateOne(
      { companyId: d.companyId, promotionId: d.promotionId },
      { $set: d } as UpdateQuery<Promotion>,
      { upsert: true },
    );
    if (res.upsertedCount > 0) {
      insertadas++;
    } else if (res.modifiedCount > 0) {
      actualizadas++;
    }
  }

  console.log(
    `Seed completado: ${docs.length} promociones (insertadas ${insertadas}, actualizadas ${actualizadas})`,
  );
  await mongoose.disconnect();
}

main().catch((err: unknown) => {
  console.error('Seed fallido:', err);
  process.exit(1);
});
