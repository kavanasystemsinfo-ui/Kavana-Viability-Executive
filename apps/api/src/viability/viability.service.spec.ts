import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { laMarinaDoc } from './viability.fixtures';
import { ViabilityService } from './viability.service';

describe('ViabilityService', () => {
  let service: ViabilityService;
  let promotionModelMock: {
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let viabilityRunModelMock: {
    create: jest.Mock;
  };

  beforeEach(async () => {
    promotionModelMock = {
      findOne: jest.fn(),
      find: jest.fn(),
    };
    viabilityRunModelMock = {
      create: jest.fn().mockResolvedValue({}),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ViabilityService,
        { provide: getModelToken('Promotion'), useValue: promotionModelMock },
        { provide: getModelToken('ViabilityRun'), useValue: viabilityRunModelMock },
      ],
    }).compile();

    service = moduleRef.get(ViabilityService);
  });

  describe('listarPromociones', () => {
    it('filtra por companyId y devuelve el resumen ordenado', async () => {
      promotionModelMock.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([laMarinaDoc]),
          }),
        }),
      });

      const result = await service.listarPromociones('kavana_viability_executive');

      expect(promotionModelMock.find).toHaveBeenCalledWith({
        companyId: 'kavana_viability_executive',
      });
      expect(result).toEqual([
        {
          promotionId: 'promo-la-marina-2',
          name: 'La Marina - Fase 2',
          status: 'Ejecución',
          city: 'Castellón de la Plana',
          unitsTotal: 96,
          unitsSold: 82,
        },
      ]);
    });
  });

  describe('calcularViabilidadPromocion', () => {
    it('calcula la viabilidad de La Marina, guarda el run y devuelve el resultado', async () => {
      promotionModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(laMarinaDoc),
      });

      const result = await service.calcularViabilidadPromocion(
        'kavana_viability_executive',
        'promo-la-marina-2',
        { fechaCorte: '2026-08-30' },
      );

      expect(promotionModelMock.findOne).toHaveBeenCalledWith({
        companyId: 'kavana_viability_executive',
        promotionId: 'promo-la-marina-2',
      });
      expect(result.resultado.revenueExpectedEur).toBe(22_320_000);
      expect(result.resultado.marginBrutoEur).toBe(820_000);
      expect(result.resultado.marginBrutoPct).toBe(3.7);
      expect(result.resultado.viable).toBe(false);
      expect(result.resultado.umbralMarginAplicadoPct).toBe(18);
      expect(result.resultado.speedVentaUdsMes).toBe(2.0);
      expect(viabilityRunModelMock.create).toHaveBeenCalledTimes(1);
      const runGuardado = viabilityRunModelMock.create.mock.calls[0][0];
      expect(runGuardado).toMatchObject({
        companyId: 'kavana_viability_executive',
        promotionId: 'promo-la-marina-2',
        fechaCorte: '2026-08-30',
      });
      expect(runGuardado.input).toMatchObject({
        id: 'promo-la-marina-2',
        fechaCorte: '2026-08-30',
      });
      expect(runGuardado.resultado.revenueExpectedEur).toBe(22_320_000);
    });

    it('lanza NotFoundException si la promoción no existe para la empresa', async () => {
      promotionModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.calcularViabilidadPromocion('kavana_viability_executive', 'promo-inexistente'),
      ).rejects.toThrow(NotFoundException);
      expect(viabilityRunModelMock.create).not.toHaveBeenCalled();
    });

    it('aplica un umbral configurable y lo documenta en el resultado', async () => {
      promotionModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(laMarinaDoc),
      });

      const result = await service.calcularViabilidadPromocion(
        'kavana_viability_executive',
        'promo-la-marina-2',
        {
          umbralMarginBrutoMinPct: 3,
          fechaCorte: '2026-08-30',
        },
      );

      expect(result.resultado.viable).toBe(true);
      expect(result.resultado.umbralMarginAplicadoPct).toBe(3);
    });

    it('sin fechaCorte el input conserva el contrato (el motor usa hoy por defecto)', async () => {
      promotionModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(laMarinaDoc),
      });

      const result = await service.calcularViabilidadPromocion(
        'kavana_viability_executive',
        'promo-la-marina-2',
      );

      const runGuardado = viabilityRunModelMock.create.mock.calls[0][0];
      expect(runGuardado.input).not.toHaveProperty('fechaCorte');
      expect(runGuardado.fechaCorte).toBeUndefined();
      expect(result.resultado.revenueExpectedEur).toBe(22_320_000);
    });
  });
});
