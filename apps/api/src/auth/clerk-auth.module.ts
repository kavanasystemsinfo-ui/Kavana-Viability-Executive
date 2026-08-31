import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Global, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ClerkWebhookController } from './clerk-webhook.controller';
import { clerkConfig } from './clerk.config';
import { ClerkService } from './clerk.service';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { CompanyIdMiddleware } from './middleware/company-id.middleware';

/**
 * Módulo global de autenticación Clerk.
 *
 * Decisión de registro (documentada): los guards se registran como APP_GUARD
 * globales porque toda la API es privada salvo los webhooks de Clerk (marcados
 * con @Public en su controller) y el health check. Esto evita olvidar
 * @UseGuards en rutas nuevas. En los tests unitarios de los guards se inyectan
 * las dependencias directamente, así que el registro global no interfiere.
 */
@Global()
@Module({
  imports: [ConfigModule.forFeature(clerkConfig)],
  controllers: [ClerkWebhookController],
  providers: [
    ClerkService,
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    CompanyIdMiddleware,
  ],
  exports: [ClerkService, CompanyIdMiddleware],
})
export class ClerkAuthModule implements NestModule {
  /**
   * CompanyIdMiddleware en todas las rutas autenticadas. El webhook de Clerk
   * queda excluido: es público y no pertenece a ninguna empresa.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CompanyIdMiddleware)
      .exclude({ path: 'webhooks/clerk', method: RequestMethod.POST })
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }

  static forRoot() {
    return {
      module: ClerkAuthModule,
      global: true,
    };
  }
}
