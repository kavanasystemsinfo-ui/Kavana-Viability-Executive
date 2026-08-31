import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Promotion, PromotionSchema } from './promotion.schema';
import { ViabilityRun, ViabilityRunSchema } from './viability-run.schema';
import { ViabilityService } from './viability.service';
import { PromotionsController } from './promotions.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Promotion.name, schema: PromotionSchema },
      { name: ViabilityRun.name, schema: ViabilityRunSchema },
    ]),
  ],
  controllers: [PromotionsController],
  providers: [ViabilityService],
})
export class ViabilityModule {}
