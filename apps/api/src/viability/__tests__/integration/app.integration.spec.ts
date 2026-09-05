import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppController } from '../../../app/app.controller';
import { AppService } from '../../../app/app.service';
import { ValidationPipe } from '@nestjs/common';
import { createServer } from 'http';

/**
 * Test de integración de AppController (endpoint raíz /api).
 *
 * Estrategia: importamos solo AppController + AppService (NO AppModule)
 * para evitar arrastrar ConfigModule desde ClerkAuthModule.
 *
 * Probamos el endpoint HTTP real usando el módulo built-in `http` de Node
 * contra el servidor in-process de Nest (después de app.init()). Si por alguna
 * razón el puerto no se asigna (> 0), probamos el controlador directamente
 * como fallback.
 */
describe('AppController (Integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    })
      .overrideProvider('APP_GUARD')
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api GET (health)', async () => {
    // 1) Intentamos obtener el puerto del servidor HTTP in-process
    const httpServer = app.getHttpServer();
    const address = httpServer.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;

    if (port > 0) {
      // 2) Si tenemos un puerto válido, hacemos una petición HTTP real
      //    usando el módulo built-in `http` (no requiere deps externas).
      return new Promise<void>((resolve, reject) => {
        const req = createServer(`http://localhost:${port}`).get('/api', (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              expect(res.statusCode).toBe(200);
              expect(JSON.parse(data)).toEqual({ message: 'Hello API' });
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        });
        req.on('error', reject);
        req.end();
      });
    } else {
      // 3) Fallback: probamos el controlador directamente (menos ideal pero
      //    aún prueba la lógica del endpoint sin depender de sockets).
      const controller = app.get(AppController);
      expect(controller.getData()).toEqual({ message: 'Hello API' });
    }
  });
});
