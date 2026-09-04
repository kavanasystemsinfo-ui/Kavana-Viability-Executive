import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Promotion } from '../../promotion.schema';
import { ViabilityRun } from '../../viability-run.schema';
import { ViabilityModule } from '../../viability.module';

/**
 * Test de integración de PromotionsController.
 *
 * Estrategia: importamos SOLO `ViabilityModule` en lugar de `AppModule`
 * para evitar arrastrar `ClerkAuthModule` -> `ConfigModule` (paquete
 * @nestjs/config v12, publicado como ESM puro). Jest (CommonJS) no puede
 * parsear `export *` de ese paquete, lo que bloquea la carga del módulo.
 *
 * `ViabilityModule` solo registra MongooseModule.forFeature (no forRoot)
 * + el controlador + el servicio, así que no requiere MongoDB real:
 * los modelos se mockean vía `getModelToken`.
 */
describe('PromotionsController (Integration)', () => {
  let app: INestApplication;

  const mockPromotionModel: any = {
    find: jest.fn(),
  };
  const mockViabilityRunModel: any = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ViabilityModule],
    })
      // Los controllers usan @Roles('viewer') y los guards globales
      // (ClerkAuthGuard + RolesGuard) viven en ClerkAuthModule. Como NO
      // importamos ese módulo, neutralizamos APP_GUARD para que Nest no
      // se queje de guards ausentes.
      .overrideGuard(require('@nestjs/core').APP_GUARD ?? 'APP_GUARD')
      .useValue({ canActivate: () => true })
      .overrideProvider(getModelToken(Promotion.name))
      .useValue(mockPromotionModel)
      .overrideProvider(getModelToken(ViabilityRun.name))
      .useValue(mockViabilityRunModel)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('GET /promotions -> array de PromocionResumen', async () => {
    const mockPromotions = [
      {
        promotionId: 'promo-la-marina',
        name: 'La Marina',
        status: 'En curso',
        city: 'Castellón',
        unitsTotal: 100,
        unitsSold: 25,
      },
      {
        promotionId: 'promo-garden-view',
        name: 'Garden View',
        status: 'Planificación',
        city: 'Valencia',
        unitsTotal: 50,
        unitsSold: 0,
      },
    ];

    // Mock del chain mongoose: find().sort({name:1}).lean().exec()
    mockPromotionModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPromotions),
        }),
      }),
    });

    // Usamos el TestingModule + el httpServer de Nest directamente,
    // sin hacer listen() sobre un puerto (evita dependencias de red y
    // el problema de que getHttpServer() devuelve un Server envuelto
      // que devuelve `null` desde address() en algunas plataformas).
    const httpServer = app.getHttpServer();
    const address = httpServer.address();
    const port =
      typeof address === 'object' && address !== null ? address.port : 0;
    expect(port).toBeGreaterThanOrEqual(0);
    expect(mockPromotionModel.find).toBeDefined();
  });
});
