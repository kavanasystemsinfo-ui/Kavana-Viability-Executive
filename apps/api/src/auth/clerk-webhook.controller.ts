import { Controller, HttpStatus, Inject, Logger, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ClerkService } from './clerk.service';
import { Public } from './decorators/public.decorator';

interface ClerkWebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

interface ClerkUserWebhookData {
  id: string;
  email_addresses?: { email_address?: string }[];
}

type RawBodyRequest = Request & { rawBody?: Buffer };

/**
 * Recibe los webhooks de Clerk. Es una ruta pública (el guard global la
 * excluye) protegida por la verificación de firma Svix, que se hace sobre el
 * cuerpo crudo de la petición.
 */
@Public()
@Controller('webhooks/clerk')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);

  constructor(@Inject(ClerkService) private readonly clerkService: ClerkService) {}

  @Post()
  async handleWebhook(@Req() req: RawBodyRequest, @Res() res: Response): Promise<void> {
    // El payload debe ser el cuerpo crudo (Buffer): Svix firma byte a byte y
    // JSON.stringify(req.body) no es fiable (reordena o reformatea).
    const payload = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));

    if (!this.clerkService.verifyWebhookSignature(payload, req.headers)) {
      this.logger.warn('Invalid webhook signature');
      res.status(HttpStatus.UNAUTHORIZED).send('Invalid signature');
      return;
    }

    const event = req.body as ClerkWebhookEvent;
    if (!event || typeof event.type !== 'string') {
      this.logger.warn('Webhook sin tipo de evento valido');
      res.status(HttpStatus.BAD_REQUEST).send('Invalid event');
      return;
    }

    this.logger.log(`Received Clerk webhook: ${event.type}`);

    try {
      switch (event.type) {
        case 'user.created':
          await this.handleUserCreated(event.data as unknown as ClerkUserWebhookData);
          break;
        case 'user.updated':
          await this.handleUserUpdated(event.data as unknown as ClerkUserWebhookData);
          break;
        case 'user.deleted':
          await this.handleUserDeleted(event.data as unknown as ClerkUserWebhookData);
          break;
        case 'session.created':
        case 'session.ended':
        case 'session.revoked':
          // Eventos de sesión: útiles más adelante para el último acceso.
          break;
        default:
          this.logger.debug(`Unhandled webhook type: ${event.type}`);
      }

      res.status(HttpStatus.OK).send('OK');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Webhook handler error: ${message}`);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error');
    }
  }

  private async handleUserCreated(userData: ClerkUserWebhookData): Promise<void> {
    this.logger.log(
      `User created: ${userData.id} (${userData.email_addresses?.[0]?.email_address ?? ''})`,
    );

    // La sincronización local es YAGNI por ahora: no existe base de datos en el
    // proyecto (Mongo/Atlas llega en tareas posteriores). Clerk es la fuente de
    // verdad y syncUserToLocal solo prepara los datos para cuando exista el
    // repositorio de usuarios.
    const synced = await this.clerkService.syncUserToLocal(userData.id);
    if (synced) {
      this.logger.log(`User preparado para sync local: ${synced.email} como ${synced.role}`);
    }
  }

  private async handleUserUpdated(userData: ClerkUserWebhookData): Promise<void> {
    this.logger.log(`User updated: ${userData.id}`);

    const synced = await this.clerkService.syncUserToLocal(userData.id);
    if (synced) {
      this.logger.log(`User re-sincronizado: ${synced.email} como ${synced.role}`);
    }
  }

  private async handleUserDeleted(userData: ClerkUserWebhookData): Promise<void> {
    this.logger.log(`User deleted: ${userData.id}`);
    // Cuando exista el repositorio local, el borrado será blando.
  }
}
