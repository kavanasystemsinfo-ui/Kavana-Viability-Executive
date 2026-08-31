import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

// Sub-documentos tipados (1:1 con fixtures/companies/kavana-viability-executive/docs/promociones.yaml)

export interface LocationDoc {
  city?: string;
  province?: string;
  coordinates?: number[];
  address?: string;
}

export interface UnitTypeDoc {
  type: string;
  count: number;
  avgM2: number;
  priceFromEur: number;
}

export interface FinancialsDoc {
  landCostEur: number;
  constructionBudgetEur: number;
  constructionSpentEur?: number;
  totalBudgetEur: number;
  revenueContractedEur: number;
  // Estimaciones del fixture demo; el motor de viabilidad SIEMPRE calcula el
  // margen y descarta estos campos (ver ADR-003).
  projectedMarginEur?: number;
  projectedMarginPct?: number;
}

export interface FinancingDoc {
  bank?: string;
  loanAmountEur?: number;
  drawnEur?: number;
  interestRate?: string;
  maturity?: string;
}

@Schema({ _id: false })
export class Location {
  @Prop() city?: string;
  @Prop() province?: string;
  @Prop({ type: [Number] }) coordinates?: number[];
  @Prop() address?: string;
}

@Schema({ _id: false })
export class UnitType {
  @Prop({ required: true }) type!: string;
  @Prop({ required: true }) count!: number;
  @Prop({ required: true }) avgM2!: number;
  @Prop({ required: true }) priceFromEur!: number;
}

@Schema({ _id: false })
export class Financials {
  @Prop({ required: true }) landCostEur!: number;
  @Prop({ required: true }) constructionBudgetEur!: number;
  @Prop() constructionSpentEur?: number;
  @Prop({ required: true }) totalBudgetEur!: number;
  @Prop({ required: true }) revenueContractedEur!: number;
  @Prop() projectedMarginEur?: number;
  @Prop() projectedMarginPct?: number;
}

@Schema({ _id: false })
export class Financing {
  @Prop() bank?: string;
  @Prop() loanAmountEur?: number;
  @Prop() drawnEur?: number;
  @Prop() interestRate?: string;
  @Prop() maturity?: string;
}

export type PromotionDocument = HydratedDocument<Promotion>;

@Schema({ collection: 'promotions', timestamps: true })
export class Promotion {
  @Prop({ required: true, index: true })
  companyId!: string;

  @Prop({ required: true })
  promotionId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: Location })
  location?: LocationDoc;

  @Prop()
  status?: string;

  @Prop()
  progressPct?: number;

  @Prop()
  startDate?: string;

  @Prop()
  estimatedDelivery?: string;

  @Prop({ required: true })
  unitsTotal!: number;

  @Prop()
  unitsSold?: number;

  @Prop()
  unitsAvailable?: number;

  @Prop({ type: [UnitType], default: [] })
  unitTypes!: UnitTypeDoc[];

  @Prop({ type: Financials, required: true })
  financials!: FinancialsDoc;

  @Prop({ type: Financing })
  financing?: FinancingDoc;

  @Prop()
  jefeProyecto?: string;

  @Prop({ type: [String], default: [] })
  criticalPath?: string[];

  @Prop({ type: [String], default: [] })
  risks?: string[];
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);

// Índice compuesto de tenant: una promoción se identifica por empresa + id de promoción.
PromotionSchema.index({ companyId: 1, promotionId: 1 }, { unique: true });
