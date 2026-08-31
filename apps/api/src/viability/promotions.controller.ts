import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { DEFAULT_COMPANY_ID } from '../auth/company-id.constants';
import type { CompanyIdRequest } from '../auth/middleware/company-id.middleware';
import { ViabilityService } from './viability.service';

/**
 * Endpoints de promociones y viabilidad. La autenticación la aplican los guards
 * globales (ClerkAuthGuard + RolesGuard); el companyId sale del request
 * (claim del token, header X-Company-ID o empresa por defecto).
 */
@Controller('promotions')
export class PromotionsController {
  constructor(@Inject(ViabilityService) private readonly viabilityService: ViabilityService) {}

  @Get()
  @Roles('viewer')
  listar(@Req() req: CompanyIdRequest) {
    return this.viabilityService.listarPromociones(req.companyId ?? DEFAULT_COMPANY_ID);
  }

  @Get(':promotionId/viability')
  @Roles('viewer')
  calcular(
    @Req() req: CompanyIdRequest,
    @Param('promotionId') promotionId: string,
    @Query('fechaCorte') fechaCorte?: string,
    @Query('umbralMarginBrutoMinPct') umbralMarginBrutoMinPct?: string,
  ) {
    const umbral =
      umbralMarginBrutoMinPct !== undefined ? Number(umbralMarginBrutoMinPct) : undefined;
    return this.viabilityService.calcularViabilidadPromocion(
      req.companyId ?? DEFAULT_COMPANY_ID,
      promotionId,
      {
        ...(fechaCorte ? { fechaCorte } : {}),
        ...(umbral !== undefined && !Number.isNaN(umbral)
          ? { umbralMarginBrutoMinPct: umbral }
          : {}),
      },
    );
  }
}
