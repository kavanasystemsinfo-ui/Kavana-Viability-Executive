/**
 * Main entry point for Kavana Viability Executive API
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  // rawBody: true expone el cuerpo crudo (Buffer) en req.rawBody, necesario
  // para verificar la firma Svix de los webhooks de Clerk byte a byte.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Global prefix
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:4200',
      'https://kavana-viability-executive.vercel.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-ID'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // El CompanyIdMiddleware se aplica desde ClerkAuthModule (consumer), excluyendo
  // la ruta pública del webhook. La autenticación la gestionan los guard globales.

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(
    `🚀 Kavana Viability Executive API running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(`📚 Swagger: http://localhost:${port}/${globalPrefix}/docs`);
}

bootstrap();
