import { Module } from '@nestjs/common';
import { ViabilityService } from './viability.service';
import { PromotionsController } from './promotions.controller';

/**
 * Módulo de viabilidad y promociones.
 *
 * Contrato actual (worktree): el ViabilityService es un mock AUTOCONTENIDO en
 * memoria (sin Mongoose) con 3 promociones de demostración (Altair, Bahía, Mar).
 * Por eso el módulo ya no registra modelos Mongoose: nada los inyecta. Cuando se
 * reintroduzca el motor real con persistencia, se volverá a añadir
 * MongooseModule.forFeature junto con los modelos.
 */
@Module({
  controllers: [PromotionsController],
  providers: [ViabilityService],
  exports: [ViabilityService],
})
export class ViabilityModule {}