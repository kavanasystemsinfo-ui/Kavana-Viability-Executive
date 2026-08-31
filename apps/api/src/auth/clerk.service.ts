import { createClerkClient, verifyToken } from '@clerk/clerk-sdk-node';
import type { OnModuleInit } from '@nestjs/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WebhookRequiredHeaders } from 'svix';
import { Webhook } from 'svix';
import type { ClerkConfig } from './clerk.config';
import { clerkConfig } from './clerk.config';
import { DEFAULT_COMPANY_ID } from './company-id.constants';

export interface ClerkPublicMetadata {
  role?: string;
  company_id?: string;
  permissions?: string[];
}

export interface ClerkUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  publicMetadata: Record<string, unknown>;
  privateMetadata: Record<string, unknown>;
  unsafeMetadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  lastSignInAt: number | null;
}

export interface VerifiedToken {
  sub: string; // Clerk user ID
  sid: string; // Session ID
  azp: string; // Authorized party
  exp: number;
  iat: number;
  nbf: number;
  iss: string;
  org_id?: string;
  company_id?: string; // Custom claim
  role?: string; // Custom claim
  permissions?: string[]; // Custom claim
}

export interface SyncedLocalUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string;
  permissions: string[];
}

const firstHeader = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? '') : (value ?? '');

@Injectable()
export class ClerkService implements OnModuleInit {
  private readonly logger = new Logger(ClerkService.name);
  private client: ReturnType<typeof createClerkClient> | null = null;
  private config: ClerkConfig;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    this.config = this.configService.get<ClerkConfig>('clerk') ?? clerkConfig();
  }

  onModuleInit() {
    this.client = createClerkClient({
      secretKey: this.config.secretKey,
      publishableKey: this.config.publishableKey,
      apiUrl: this.config.apiUrl,
    });
    this.logger.log('Clerk client initialized');
  }

  getClient() {
    return this.client;
  }

  getConfig(): ClerkConfig {
    return this.config;
  }

  /**
   * Verifica un token de sesión de Clerk (JWT).
   * Devuelve null si la verificación falla o si no hay secretKey configurada.
   */
  async verifyToken(token: string): Promise<VerifiedToken | null> {
    try {
      const verified = await verifyToken(token, {
        secretKey: this.config.secretKey,
        apiUrl: this.config.apiUrl,
        ...this.config.verifyOptions,
      });
      return verified as VerifiedToken;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Token verification failed: ${message}`);
      return null;
    }
  }

  /**
   * Obtiene un usuario de Clerk por su ID.
   */
  async getUser(userId: string): Promise<ClerkUser | null> {
    try {
      if (!this.client) {
        throw new Error('Clerk client no inicializado');
      }
      const user = await this.client.users.getUser(userId);
      return {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        publicMetadata: user.publicMetadata as Record<string, unknown>,
        privateMetadata: user.privateMetadata as Record<string, unknown>,
        unsafeMetadata: user.unsafeMetadata as Record<string, unknown>,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastSignInAt: user.lastSignInAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get user ${userId}: ${message}`);
      return null;
    }
  }

  /**
   * Obtiene un usuario de Clerk por email.
   */
  async getUserByEmail(email: string): Promise<ClerkUser | null> {
    try {
      if (!this.client) {
        throw new Error('Clerk client no inicializado');
      }
      const users = await this.client.users.getUserList({ emailAddress: [email] });
      if (users.length === 0) return null;
      const user = users[0];
      if (!user) return null;
      return {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        publicMetadata: user.publicMetadata as Record<string, unknown>,
        privateMetadata: user.privateMetadata as Record<string, unknown>,
        unsafeMetadata: user.unsafeMetadata as Record<string, unknown>,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastSignInAt: user.lastSignInAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get user by email ${email}: ${message}`);
      return null;
    }
  }

  /**
   * Prepara los datos del usuario para persistencia local.
   *
   * IMPORTANTE (YAGNI): hoy no existe base de datos en el proyecto (Mongo/Atlas
   * llega en tareas posteriores del pipeline RAG). Clerk es la única fuente de
   * verdad y este método SOLO deriva los valores que se persistirán cuando
   * exista el repositorio de usuarios. No ejecuta ninguna escritura.
   */
  async syncUserToLocal(userId: string): Promise<SyncedLocalUser | null> {
    const clerkUser = await this.getUser(userId);
    if (!clerkUser) return null;

    const metadata = clerkUser.publicMetadata as unknown as ClerkPublicMetadata;
    const rawRole = typeof metadata.role === 'string' ? metadata.role : undefined;
    const role = (rawRole && this.config.roleMapping[rawRole]) || this.config.defaultRole;
    const companyId = metadata.company_id || DEFAULT_COMPANY_ID;
    const permissions = Array.isArray(metadata.permissions) ? metadata.permissions : [];

    return {
      userId: clerkUser.id,
      email: clerkUser.email,
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      role,
      companyId,
      permissions,
    };
  }

  /**
   * Actualiza la metadata pública de un usuario en Clerk.
   */
  async updateUserMetadata(userId: string, metadata: Record<string, unknown>): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Clerk client no inicializado');
      }
      await this.client.users.updateUser(userId, {
        publicMetadata: metadata,
      });
      this.logger.log(`Updated metadata for user ${userId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update metadata for ${userId}: ${message}`);
      throw error;
    }
  }

  /**
   * Asigna rol y empresa a un usuario vía metadata pública de Clerk.
   */
  async assignRole(
    userId: string,
    role: string,
    companyId: string = DEFAULT_COMPANY_ID,
  ): Promise<void> {
    await this.updateUserMetadata(userId, {
      role,
      company_id: companyId,
    });
  }

  /**
   * Crea un usuario en Clerk (para invitaciones de administración).
   */
  async createUser(
    email: string,
    role: string,
    companyId: string,
    firstName?: string,
    lastName?: string,
  ): Promise<ClerkUser | null> {
    try {
      if (!this.client) {
        throw new Error('Clerk client no inicializado');
      }
      const user = await this.client.users.createUser({
        emailAddress: [email],
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        publicMetadata: {
          role,
          company_id: companyId,
          permissions: [],
        },
        skipPasswordRequirement: true, // La contraseña se fija vía invitación
      });
      return {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        publicMetadata: user.publicMetadata as Record<string, unknown>,
        privateMetadata: user.privateMetadata as Record<string, unknown>,
        unsafeMetadata: user.unsafeMetadata as Record<string, unknown>,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastSignInAt: user.lastSignInAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create user ${email}: ${message}`);
      return null;
    }
  }

  /**
   * Elimina un usuario de Clerk.
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Clerk client no inicializado');
      }
      await this.client.users.deleteUser(userId);
      this.logger.log(`Deleted user ${userId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete user ${userId}: ${message}`);
      throw error;
    }
  }

  /**
   * Verifica la firma de un webhook de Clerk usando la especificación estándar
   * de Svix (headers svix-id, svix-timestamp y svix-signature). El payload debe
   * ser el cuerpo crudo de la petición (Buffer), porque Svix firma byte a byte.
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const webhookSecret = this.config.webhookSecret;
    if (!webhookSecret) {
      this.logger.warn('CLERK_WEBHOOK_SECRET no configurado; webhooks rechazados');
      return false;
    }
    try {
      const webhook = new Webhook(webhookSecret);
      const svixHeaders: WebhookRequiredHeaders = {
        'svix-id': firstHeader(headers['svix-id']),
        'svix-timestamp': firstHeader(headers['svix-timestamp']),
        'svix-signature': firstHeader(headers['svix-signature']),
      };
      webhook.verify(payload, svixHeaders);
      return true;
    } catch {
      return false;
    }
  }
}
