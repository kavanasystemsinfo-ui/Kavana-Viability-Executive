import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import type { ViabilityInput, ViabilityResult } from '@kavana-viability-executive/viability-engine';

export type ViabilityRunDocument = HydratedDocument<ViabilityRun>;

/**
 * Histórico inmutable de cálculos del motor de viabilidad por promoción.
 * Guarda el resultado y un snapshot del input para poder reproducir el cálculo.
 */
@Schema({ collection: 'viability_runs', timestamps: true })
export class ViabilityRun {
  @Prop({ required: true, index: true })
  companyId!: string;

  @Prop({ required: true })
  promotionId!: string;

  @Prop({ type: Object, required: true })
  input!: ViabilityInput;

  @Prop({ type: Object, required: true })
  resultado!: ViabilityResult;

  @Prop()
  fechaCorte?: string;
}

export const ViabilityRunSchema = SchemaFactory.createForClass(ViabilityRun);

ViabilityRunSchema.index({ companyId: 1, promotionId: 1, createdAt: -1 });
