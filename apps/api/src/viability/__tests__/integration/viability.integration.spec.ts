import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { PromotionsController } from '../../promotions.controller';
import { ViabilityModule } from '../../viability.module';

/**
 * Test de integración de ViabilityController (endpoint /promotions/:id/viability)
 * contra el contrato ACTUAL: `calcularViabilidadPromocion(promotionId)` con 1
 * argumento devuelve el resultado plano del mock en memoria (Altair/Bahía/Mar).
 *
 * Estrategia idéntica a promotions.integration.spec.ts: importamos solo
 * `ViabilityModule` en lugar de `AppModule` para evitar el conflicto ESM de
 * @nestjs/config v12, y neutralizamos APP_GUARD (los guards vienen de
 * ClerkAuthModule, que no importamos). El servicio real no usa Mongoose.
 */
describe('ViabilityController (Integration)', () => {
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

  it('GET /promotions/:id/viability devuelve el resultado plano de promo-1 (Altair)', async () => {
    const result = await controller.calcular('promo-1');

    expect(result).toEqual({
      promotionId: 'promo-1',
      nombre: 'Promoción Altair',
      margenBruto: 30,
      esViable: true,
      recomendacion: 'Promoción viable',
    });
  });

  it('GET /promotions/:id/viability responde con error plano si la promoción no existe', async () => {
    const result = await controller.calcular('promo-inexistente');

    expect(result).toEqual({
      promotionId: 'promo-inexistente',
      error: 'Promoción no encontrada',
    });
  });

  it('el módulo cablea el controller con el ViabilityService real en memoria', async () => {
    const listado = await controller.listar({
      companyId: 'kavana_viability_executive',
      userRole: 'viewer',
    } as any);

    expect(listado).toHaveLength(3);
    expect(listado[0]).toHaveProperty('margin');
  });
});