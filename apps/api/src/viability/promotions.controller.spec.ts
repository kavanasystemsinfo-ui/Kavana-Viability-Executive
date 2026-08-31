import { PromotionsController } from './promotions.controller';
import { ViabilityService } from './viability.service';

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
        .mockResolvedValue([{ promotionId: 'promo-la-marina-2', name: 'La Marina - Fase 2' }]),
      calcularViabilidadPromocion: jest.fn().mockResolvedValue({
        promotionId: 'promo-la-marina-2',
        companyId: 'kavana_viability_executive',
        resultado: { revenueExpectedEur: 22_320_000 },
      }),
    };
    controller = new PromotionsController(serviceMock as any);
  });

  it('listar usa la empresa por defecto si el request no trae companyId', async () => {
    const req: any = {};
    await controller.listar(req);
    expect(serviceMock.listarPromociones).toHaveBeenCalledWith('kavana_viability_executive');
  });

  it('listar usa el companyId del request cuando existe', async () => {
    const req: any = { companyId: 'otra-empresa' };
    await controller.listar(req);
    expect(serviceMock.listarPromociones).toHaveBeenCalledWith('otra-empresa');
  });

  it('calcular pasa promotionId, fechaCorte y umbral configurable', async () => {
    const req: any = { companyId: 'kavana_viability_executive' };
    await controller.calcular(req, 'promo-la-marina-2', '2026-08-30', '3');
    expect(serviceMock.calcularViabilidadPromocion).toHaveBeenCalledWith(
      'kavana_viability_executive',
      'promo-la-marina-2',
      {
        fechaCorte: '2026-08-30',
        umbralMarginBrutoMinPct: 3,
      },
    );
  });

  it('calcular sin query params llama sin opciones de cálculo', async () => {
    const req: any = {};
    await controller.calcular(req, 'promo-la-marina-2', undefined, undefined);
    expect(serviceMock.calcularViabilidadPromocion).toHaveBeenCalledWith(
      'kavana_viability_executive',
      'promo-la-marina-2',
      {},
    );
  });

  it('calcular ignora un umbral no numérico (NaN) sin pasarlo al servicio', async () => {
    const req: any = { companyId: 'kavana_viability_executive' };
    await controller.calcular(req, 'promo-la-marina-2', undefined, 'abc');
    expect(serviceMock.calcularViabilidadPromocion).toHaveBeenCalledWith(
      'kavana_viability_executive',
      'promo-la-marina-2',
      {},
    );
  });
});
