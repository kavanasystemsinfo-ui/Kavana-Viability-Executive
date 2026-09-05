import { DEFAULT_COMPANY_ID } from '../auth/company-id.constants';
import { PromotionsController } from './promotions.controller';
import { ViabilityService } from './viability.service';

/**
 * Contrato ACTUAL del PromotionsController: `listar(req)` delega en
 * `listarPromociones(companyId, role)` y `calcular(promotionId)` delega en
 * `calcularViabilidadPromocion(promotionId)` con un ÚNICO argumento.
 */
describe('PromotionsController', () => {
  let controller: PromotionsController;
  let serviceMock: {
    listarPromociones: jest.Mock;
    calcularViabilidadPromocion: jest.Mock;
  };

  beforeEach(() => {
    serviceMock = {
      listarPromociones: jest
        .fn()
        .mockResolvedValue([{ promotionId: 'promo-1', name: 'Promoción Altair' }]),
      calcularViabilidadPromocion: jest.fn().mockResolvedValue({
        promotionId: 'promo-1',
        nombre: 'Promoción Altair',
        margenBruto: 30,
        esViable: true,
        recomendacion: 'Promoción viable',
      }),
    };
    controller = new PromotionsController(serviceMock as any);
  });

  it('listar usa la empresa por defecto y el rol viewer si el request no trae nada', async () => {
    await controller.listar({} as any);

    expect(serviceMock.listarPromociones).toHaveBeenCalledWith(DEFAULT_COMPANY_ID, 'viewer');
  });

  it('listar usa el companyId y el rol del request cuando existen', async () => {
    const req: any = { companyId: 'otra-empresa', userRole: 'admin' };

    await controller.listar(req);

    expect(serviceMock.listarPromociones).toHaveBeenCalledWith('otra-empresa', 'admin');
  });

  it('calcular delega en el servicio con el promotionId como único argumento', async () => {
    await controller.calcular('promo-1');

    expect(serviceMock.calcularViabilidadPromocion).toHaveBeenCalledTimes(1);
    expect(serviceMock.calcularViabilidadPromocion).toHaveBeenCalledWith('promo-1');
  });

  it('calcular devuelve el resultado plano del servicio', async () => {
    const result = await controller.calcular('promo-1');

    expect(result).toEqual({
      promotionId: 'promo-1',
      nombre: 'Promoción Altair',
      margenBruto: 30,
      esViable: true,
      recomendacion: 'Promoción viable',
    });
  });
});