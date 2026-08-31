import { HttpStatus } from '@nestjs/common';
import { ClerkWebhookController } from './clerk-webhook.controller';

// @nestjs/config v12 distribuye ESM puro; en tests unitarios CJS se mockea
// para no cargar el módulo real (el controller importa ClerkService).
jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigServiceMock {},
  ConfigModule: {},
  registerAs: (_token: string, factory: () => unknown) => factory,
}));

describe('ClerkWebhookController', () => {
  let controller: ClerkWebhookController;
  let clerkServiceMock: {
    verifyWebhookSignature: jest.Mock;
    syncUserToLocal: jest.Mock;
  };

  const buildRes = () => {
    const res: any = { body: undefined, statusCode: undefined };
    res.status = jest.fn().mockImplementation((code: number) => {
      res.statusCode = code;
      return res;
    });
    res.send = jest.fn().mockImplementation((body: string) => {
      res.body = body;
      return res;
    });
    return res;
  };

  beforeEach(() => {
    clerkServiceMock = {
      verifyWebhookSignature: jest.fn(),
      syncUserToLocal: jest.fn().mockResolvedValue({
        userId: 'user_1',
        email: 'ana@kavana.es',
        role: 'viewer',
        companyId: 'kavana_viability_executive',
      }),
    };
    controller = new ClerkWebhookController(clerkServiceMock as any);
  });

  it('responde 200 y sincroniza al usuario con una firma valida', async () => {
    const payload = JSON.stringify({
      type: 'user.created',
      data: { id: 'user_1', email_addresses: [{ email_address: 'ana@kavana.es' }] },
    });
    clerkServiceMock.verifyWebhookSignature.mockReturnValue(true);
    const req: any = {
      headers: {
        'svix-id': 'msg_1',
        'svix-timestamp': String(Math.floor(Date.now() / 1000)),
        'svix-signature': 'v1,firma',
      },
      rawBody: Buffer.from(payload),
      body: JSON.parse(payload),
    };
    const res = buildRes();

    await controller.handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(res.body).toBe('OK');
    expect(clerkServiceMock.verifyWebhookSignature).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ 'svix-signature': 'v1,firma' }),
    );
    expect(clerkServiceMock.syncUserToLocal).toHaveBeenCalledWith('user_1');
  });

  it('responde 401 y no sincroniza nada con una firma invalida', async () => {
    const payload = JSON.stringify({ type: 'user.created', data: { id: 'user_1' } });
    clerkServiceMock.verifyWebhookSignature.mockReturnValue(false);
    const req: any = {
      headers: {
        'svix-id': 'msg_2',
        'svix-timestamp': String(Math.floor(Date.now() / 1000)),
        'svix-signature': 'v1,firma-mala',
      },
      rawBody: Buffer.from(payload),
      body: JSON.parse(payload),
    };
    const res = buildRes();

    await controller.handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(res.body).toBe('Invalid signature');
    expect(clerkServiceMock.syncUserToLocal).not.toHaveBeenCalled();
  });

  it('no rompe con tipos de evento no manejados', async () => {
    const payload = JSON.stringify({ type: 'organization.created', data: { id: 'org_1' } });
    clerkServiceMock.verifyWebhookSignature.mockReturnValue(true);
    const req: any = {
      headers: {
        'svix-id': 'msg_3',
        'svix-timestamp': String(Math.floor(Date.now() / 1000)),
        'svix-signature': 'v1,firma',
      },
      rawBody: Buffer.from(payload),
      body: JSON.parse(payload),
    };
    const res = buildRes();

    await controller.handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(res.body).toBe('OK');
  });
});
