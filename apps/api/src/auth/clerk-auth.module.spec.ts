import { Test } from '@nestjs/testing';
import { ClerkAuthModule } from './clerk-auth.module';
import { ClerkService } from './clerk.service';
import { CompanyIdMiddleware } from './middleware/company-id.middleware';

// @nestjs/config v12 distribuye ESM puro; en tests unitarios CJS se mockea
// para no cargar el módulo real (ver convención en las specs de auth).
jest.mock('@nestjs/config', () => {
  class ConfigServiceMock {
    get() {
      return undefined;
    }
  }
  return {
    ConfigModule: {
      forFeature: () => ({
        module: class ConfigModuleForFeatureMock {},
        providers: [ConfigServiceMock],
        exports: [ConfigServiceMock],
      }),
    },
    ConfigService: ConfigServiceMock,
    registerAs: (_token: string, factory: () => unknown) => factory,
  };
});

/**
 * Regresion del boot de la API: ClerkAuthModule exportaba clerkConfig (una
 * ConfigFactory de registerAs) en `exports`, cosa que Nest rechaza en el
 * escaneo DI con UnknownExportException. Ningun test lo detectaba porque los
 * tests unitarios mokean los guards y el build no ejecuta DI. Este test
 * compila el modulo real y falla (o pasaba) con el error del boot.
 */
describe('ClerkAuthModule', () => {
  it('compila el modulo sin errores de DI (regresion: export de clerkConfig)', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ClerkAuthModule],
    }).compile();

    expect(moduleRef.get(ClerkService)).toBeDefined();
    expect(moduleRef.get(CompanyIdMiddleware)).toBeDefined();
  });
});
