import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { PromotionsController } from '../../promotions.controller';
import { ViabilityModule } from '../../viability.module';

/**
 * Test de integración de PromotionsController (endpoint GET /promotions) contra
 * el contrato ACTUAL del ViabilityService: mock en memoria con 3 promociones
 * (Altair, Bahía, Mar) y resumen {promotionId, name, status, location,
 * unitsTotal, unitsSold, avgPrice, totalRevenue, margin}.
 *
 * Estrategia: importamos SOLO `ViabilityModule` en lugar de `AppModule` para
 * evitar arrastrar `ClerkAuthModule` -> `ConfigModule` (paquete @nestjs/config
 * v12, publicado como ESM puro que Jest en CommonJS no puede parsear), y
 * neutralizamos APP_GUARD porque los guards globales viven en ClerkAuthModule.
 * El servicio real (en memoria) no requiere MongoDB ni mocks de modelos.
 */
describe('PromotionsController (Integration)', () => {
  let app: INestApplication;
  let controller: PromotionsController;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ViabilityModule],
    })
      .overrideGuard(APP_GUARD ?? 'APP_GUARD')
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    controller = app.get(PromotionsController);
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /promotions devuelve las 3 promociones de demostración', async () => {
    const result = await controller.listar({
      companyId: 'kavana_viability_executive',
      userRole: 'viewer',
    } as any);

    expect(result).toHaveLength(3);
    expect(result.map((p: any) => p.promotionId)).toEqual(['promo-1', 'promo-2', 'promo-3']);
  });

  it('GET /promotions devuelve el resumen completo del contrato para cada promoción', async () => {
    const result = await controller.listar({
      companyId: 'kavana_viability_executive',
      userRole: 'viewer',
    } as any);

    expect(result[0]).toMatchObject({
      promotionId: 'promo-1',
      name: 'Promoción Altair',
      status: 'En venta',
      location: { city: 'Castellón' },
      unitsTotal: 100,
      unitsSold: 25,
      avgPrice: 150000,
      totalRevenue: 3750000,
      margin: 30,
    });
  });

  it('GET /promotions aplica la empresa por defecto si el request no trae companyId', async () => {
    const result = await controller.listar({} as any);

    expect(result).toHaveLength(3);
  });
});