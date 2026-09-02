import { Webhook } from 'svix';
import type { VerifiedToken } from './clerk.service';
import { ClerkService } from './clerk.service';

jest.mock('@clerk/clerk-sdk-node', () => ({
  createClerkClient: jest.fn(),
  verifyToken: jest.fn(),
}));

// @nestjs/config v12 distribuye ESM puro; en tests unitarios CJS se mockea
// para no cargar el módulo real.
jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigServiceMock {},
  ConfigModule: {},
  registerAs: (_token: string, factory: () => unknown) => factory,
}));

import { createClerkClient, verifyToken } from '@clerk/clerk-sdk-node';

const mockCreateClerkClient = createClerkClient as jest.Mock;
const mockVerifyToken = verifyToken as jest.Mock;

const config = {
  publishableKey: 'pk_test_placeholder',
  secretKey: 'sk_test_placeholder',
  apiUrl: 'https://api.clerk.com',
  jwtKey: '',
  client: undefined,
  webhookSecret: 'whsec_' + Buffer.from('clave-de-pruebas').toString('base64'),
  allowedOrigins: ['http://localhost:4200'],
  roleMapping: {
    super_admin: 'super_admin',
    admin: 'admin',
    director: 'director',
    jefe_proyecto: 'jefe_proyecto',
    analista: 'analista',
    comercial: 'comercial',
    viewer: 'viewer',
  },
  defaultRole: 'viewer',
  companyIdClaim: 'company_id',
  verifyOptions: {
    clockSkewInSeconds: 30,
    authorizedParties: [],
  },
};

const configServiceMock = {
  get: jest.fn().mockReturnValue(config),
};

describe('ClerkService', () => {
  let service: ClerkService;

  beforeEach(() => {
    jest.clearAllMocks();
    configServiceMock.get.mockReturnValue(config);
    service = new ClerkService(configServiceMock as any);
  });

  describe('verifyToken', () => {
    it('devuelve el token verificado cuando la firma es valida', async () => {
      const verified: VerifiedToken = {
        sub: 'user_1',
        sid: 'sess_1',
        azp: 'http://localhost:4200',
        exp: 2000000000,
        iat: 1999999000,
        nbf: 1999999000,
        iss: 'https://clerk.example.com',
        role: 'admin',
        company_id: 'kavana_viability_executive',
      };
      mockVerifyToken.mockResolvedValue(verified);

      const result = await service.verifyToken('un-token');

      expect(result).toEqual(verified);
      expect(mockVerifyToken).toHaveBeenCalledWith(
        'un-token',
        expect.objectContaining({ secretKey: 'sk_test_placeholder' }),
      );
    });

    it('normaliza los claims desde metadata.* (formato actual del template de sesion)', async () => {
      mockVerifyToken.mockResolvedValue({
        sub: 'user_3ImCPd9CkIBoHJnJQx2r2e5fLzc',
        sid: 'sess_1',
        azp: 'http://localhost:4200',
        exp: 2000000000,
        iat: 1999999000,
        nbf: 1999999000,
        iss: 'https://clerk.example.com',
        metadata: {
          role: 'super_admin',
          company_id: 'kavana_viability_executive',
          permissions: ['promotions:read', 'promotions:write', 'viability:run', 'agents:invoke'],
        },
      });

      const result = await service.verifyToken('un-token');

      expect(result?.role).toBe('super_admin');
      expect(result?.company_id).toBe('kavana_viability_executive');
      expect(result?.permissions).toEqual([
        'promotions:read',
        'promotions:write',
        'viability:run',
        'agents:invoke',
      ]);
      // Los claims estandar del token no se pierden
      expect(result?.sub).toBe('user_3ImCPd9CkIBoHJnJQx2r2e5fLzc');
      expect(result?.sid).toBe('sess_1');
      expect(result?.exp).toBe(2000000000);
      expect(result?.iss).toBe('https://clerk.example.com');
    });

    it('devuelve null cuando la verificacion falla', async () => {
      mockVerifyToken.mockRejectedValue(new Error('Token expirado'));

      const result = await service.verifyToken('token-invalido');

      expect(result).toBeNull();
    });
  });

  describe('verifyWebhookSignature (svix)', () => {
    it('acepta una firma svix valida', () => {
      const webhook = new Webhook(config.webhookSecret);
      const msgId = 'msg_test_1';
      const timestamp = new Date();
      const payload = JSON.stringify({ type: 'user.created', data: { id: 'user_1' } });
      const headers = {
        'svix-id': msgId,
        'svix-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
        'svix-signature': webhook.sign(msgId, timestamp, payload),
      };

      const result = service.verifyWebhookSignature(payload, headers);

      expect(result).toBe(true);
    });

    it('rechaza una firma svix invalida', () => {
      const payload = JSON.stringify({ type: 'user.created', data: { id: 'user_1' } });
      const headers = {
        'svix-id': 'msg_test_1',
        'svix-timestamp': String(Math.floor(Date.now() / 1000)),
        'svix-signature': 'v1,ZmFrZS1maXJtYQ==',
      };

      const result = service.verifyWebhookSignature(payload, headers);

      expect(result).toBe(false);
    });

    it('rechaza un payload alterado aunque los headers sean validos', () => {
      const webhook = new Webhook(config.webhookSecret);
      const msgId = 'msg_test_2';
      const timestamp = new Date();
      const payload = JSON.stringify({ type: 'user.created', data: { id: 'user_1' } });
      const headers = {
        'svix-id': msgId,
        'svix-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
        'svix-signature': webhook.sign(msgId, timestamp, payload),
      };

      const result = service.verifyWebhookSignature(payload + ' ', headers);

      expect(result).toBe(false);
    });

    it('rechaza la peticion si no hay webhook secret configurado', () => {
      configServiceMock.get.mockReturnValue({ ...config, webhookSecret: '' });

      const result = service.verifyWebhookSignature('{}', {
        'svix-id': 'a',
        'svix-timestamp': '1',
        'svix-signature': 'v1,x',
      });

      expect(result).toBe(false);
    });
  });

  describe('syncUserToLocal (sin persistencia, Clerk como fuente de verdad)', () => {
    it('deriva role, companyId y permissions desde publicMetadata', async () => {
      mockCreateClerkClient.mockReturnValue({
        users: {
          getUser: jest.fn().mockResolvedValue({
            id: 'user_1',
            emailAddresses: [{ emailAddress: 'ana@kavana.es' }],
            firstName: 'Ana',
            lastName: 'Garcia',
            imageUrl: 'https://img.clerk.com/1',
            publicMetadata: {
              role: 'analista',
              company_id: 'empresa-b',
              permissions: ['proyectos:leer'],
            },
            privateMetadata: {},
            unsafeMetadata: {},
            createdAt: 1000,
            updatedAt: 1000,
            lastSignInAt: 1000,
          }),
        },
      });
      await service.onModuleInit();

      const result = await service.syncUserToLocal('user_1');

      expect(result).toEqual({
        userId: 'user_1',
        email: 'ana@kavana.es',
        firstName: 'Ana',
        lastName: 'Garcia',
        role: 'analista',
        companyId: 'empresa-b',
        permissions: ['proyectos:leer'],
      });
    });

    it('aplica role viewer y companyId por defecto cuando no hay metadata', async () => {
      mockCreateClerkClient.mockReturnValue({
        users: {
          getUser: jest.fn().mockResolvedValue({
            id: 'user_2',
            emailAddresses: [{ emailAddress: 'nuevo@kavana.es' }],
            firstName: null,
            lastName: null,
            imageUrl: '',
            publicMetadata: {},
            privateMetadata: {},
            unsafeMetadata: {},
            createdAt: 1000,
            updatedAt: 1000,
            lastSignInAt: null,
          }),
        },
      });
      await service.onModuleInit();

      const result = await service.syncUserToLocal('user_2');

      expect(result?.role).toBe('viewer');
      expect(result?.companyId).toBe('kavana_viability_executive');
    });
  });
});
