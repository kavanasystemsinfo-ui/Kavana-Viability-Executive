import { Module } from '@nestjs/common';
import { OrquestadorService } from './orchestrator.service';
import { ViabilityModule } from '../viability/viability.module';

@Module({
  imports: [ViabilityModule],
  providers: [OrquestadorService],
  exports: [OrquestadorService],
})
export class OrquestadorModule {}
