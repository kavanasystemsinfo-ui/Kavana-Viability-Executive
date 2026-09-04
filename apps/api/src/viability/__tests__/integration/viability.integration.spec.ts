import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Promotion } from '../../promotion.schema';
import { ViabilityRun } from '../../viability-run.schema';
import { laMarinaDoc } from '../../viability.fixtures';
import { ViabilityModule } from '../../viability.module';
import { PromotionsController } from '../../promotions.controller';
import { createServer } from 'http';

/**
 * Test de integración de ViabilityController (endpoint /promotions/:id/viability).
 *
 * Estrategia idéntica a promotions.integration.spec.ts: importamos solo
 * `ViabilityModule` en lugar de `AppModule` para evitar el conflicto ESM de
 * @nestjs/config v12. Mockamos los modelos de Mongoose y neutralizamos
 * APP_GUARD (los guards vienen de ClerkAuthModule, que no importamos).
 *
 * Probamos el endpoint HTTP real usando el módulo built-in `http` de Node
 * contra el servidor in-process de Nest (después de app.init()). Si por alguna
 * razón el puerto no se asigna (> 0), probamos el controlador directamente
 * vía inyección de dependencias.
 */
describe('ViabilityController (Integration)', () => {
  let app: INestApplication;

  const mockPromotionModel: any = {
    findOne: jest.fn(),
  };
  const mockViabilityRunModel: any = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ViabilityModule],
    })
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

  it('GET /promotions/:id/viability -> ResultadoViabilidadPromocion con La Marina', async () => {
    const companyId = 'kavana_viability_executive';
    const promotionId = 'promo-la-marina';

    // Mock del fixture: el controller ajusta companyId por defecto si el request
    // no lo trae (nuestro mock de guard lo deja undefined -> DEFAULT_COMPANY_ID entra).
    const mockPromotion = {
      ...laMarinaDoc,
      promotionId,
      companyId,
    };

    // Mockeamos findOne para que devuelva un objeto con exec() que resuelva a la promoción
    mockPromotionModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockPromotion),
    });

    // 1) Intentamos obtener el puerto del servidor HTTP in-process
    const httpServer = app.getHttpServer();
    const address = httpServer.address();
    const port =
      typeof address === 'object' && address !== null ? address.port : 0;

    if (port > 0) {
      // 2) Si tenemos un puerto válido, hacemos una petición HTTP real
      //    usando el módulo built-in `http` de Node (no requiere deps externas).
      return new Promise<void>((resolve, reject) => {
        const req = createServer(`http://localhost:${port}`).get(
          `/api/promotions/${promotionId}/viability`,
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              try {
                expect(res.statusCode).toBe(200);
                const parsed = JSON.parse(data);
                // Verificamos que la respuesta tenga la estructura esperada
                expect(parsed).toHaveProperty('promotionId', promotionId);
                expect(parsed).toHaveProperty('companyId', companyId);
                expect(parsed).toHaveProperty('resultado');
                // El resultado debe tener los campos calculados por el motor
                expect(parsed.resultado).toHaveProperty('revenueExpectedEur');
                expect(parsed.resultado).toHaveProperty('marginBrutoPct');
                expect(typeof parsed.resultado.revenueExpectedEur === 'number').toBe(true);
                expect(typeof parsed.resultado.marginBrutoPct === 'number').toBe(true);
                resolve();
              } catch (e) {
                reject(e);
              }
            });
          }
        );
        req.on('error', reject);
        req.end();
      });
    } else {
      // 3) Fallback: probamos el controlador directamente mediante DI
      const controller = app.get(PromotionsController);
      // Llamamos al método del controller con un request mock que tenga companyId
      // (nuestro mock de guard deja req.companyId undefined, por lo que el
      // controller usará DEFAULT_COMPANY_ID).
      const req = { companyId: undefined as any }; // simula falta de companyId en request
      return controller.calcular(req, promotionId, undefined, undefined).then((result) => {
        // Verificamos que el resultado tenga la estructura esperada
        expect(result).toHaveProperty('promotionId', promotionId);
        expect(result).toHaveProperty('companyId', companyId);
        expect(result).toHaveProperty('resultado');
        // El resultado debe tener los campos calculados por el motor
        expect(result.resultado).toHaveProperty('revenueExpectedEur');
        expect(result.resultado).toHaveProperty('marginBrutoPct');
        expect(typeof result.resultado.revenueExpectedEur === 'number').toBe(true);
        expect(typeof result.resultado.marginBrutoPct === 'number').toBe(true);
        // Además verificamos que el mock del modelo haya sido llamado correctamente
        expect(mockPromotionModel.findOne).toHaveBeenCalledWith({
          companyId,
          promotionId,
        });
      });
    }
  });
});