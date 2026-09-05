import { Controller, Get, Inject, Param, Req } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { DEFAULT_COMPANY_ID } from '../auth/company-id.constants';
import type { CompanyIdRequest } from '../auth/middleware/company-id.middleware';
import { ViabilityService } from './viability.service';

interface AuthenticatedRequest extends CompanyIdRequest {
  userRole?: string;
}

/**
 * Endpoints de promociones y viabilidad. La autenticación la aplican los guards
 * globales (ClerkAuthGuard + RolesGuard); el companyId sale del request
 * (claim del token, header X-Company-ID o empresa por defecto).
 */
@Controller('promotions')
export class PromotionsController {
  constructor(@Inject(ViabilityService) private readonly viabilityService: ViabilityService) {}

  /**
   * Lista las promociones visibles para la empresa del request (resumen, no detalle).
   *
   * @param req - Request autenticado; su `companyId` puede venir del claim o del
   *   middleware de empresa, y se cae al `DEFAULT_COMPANY_ID` si no está.
   * @returns Array de `PromocionResumen` ordenados por nombre.
   */
  @Get()
  @Roles('viewer')
  listar(@Req() req: AuthenticatedRequest) {
    return this.viabilityService.listarPromociones(
      req.companyId ?? DEFAULT_COMPANY_ID,
      req.userRole ?? 'viewer',
    );
  }

  /**
   * Calcula (o recalcula) la viabilidad de una promoción concreta.
   *
   * @param req - Request autenticado del que se obtiene el `companyId` (claim
   *   del token o header X-Company-ID; fallback a `DEFAULT_COMPANY_ID`).
   * @param promotionId - Identificador de la promoción dentro de la empresa.
   * @param fechaCorte - (Opcional) Fecha ISO desde la que contar unidades vendidas.
   * @param umbralMarginBrutoMinPct - (Opcional) Umbral de margen bruto mínimo (%)
   *   en formato string; valores no numéricos se descartan y se aplica el default
   *   del motor (18%).
   * @returns `ResultadoViabilidadPromocion` con el cálculo persistido en `viability_runs`.
   */
  @Get(':promotionId/viability')
  @Roles('viewer')
  calcular(@Param('promotionId') promotionId: string) {
    return this.viabilityService.calcularViabilidadPromocion(promotionId);
  }
}
