import { UnauthorizedException } from '@nestjs/common';
import { ClerkAuthGuard } from './clerk-auth.guard';

// @nestjs/config v12 distribuye ESM puro; en tests unitarios CJS se mockea
// para no cargar el módulo real (el guard importa ClerkService, que lo usa).
jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigServiceMock {},
  ConfigModule: {},
  registerAs: (_token: string, factory: () => unknown) => factory,
}));

describe('ClerkAuthGuard', () => {
  let guard: ClerkAuthGuard;
  let clerkServiceMock: { verifyToken: jest.Mock };
  let reflectorMock: { getAllAndOverride: jest.Mock };

  const buildContext = (req: any) => ({
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  });

  beforeEach(() => {
    clerkServiceMock = { verifyToken: jest.fn() };
    reflectorMock = { getAllAndOverride: jest.fn().mockReturnValue(null) };
    guard = new ClerkAuthGuard(clerkServiceMock as any, reflectorMock as any);
  });

  it('permite el acceso a rutas marcadas como publicas sin token', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(true);
    const req: any = { headers: {} };

    const result = await guard.canActivate(buildContext(req) as any);

    expect(result).toBe(true);
    expect(clerkServiceMock.verifyToken).not.toHaveBeenCalled();
  });

  it('lanza UnauthorizedException cuando no hay header Authorization', async () => {
    const req: any = { headers: {} };

    await expect(guard.canActivate(buildContext(req) as any)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(clerkServiceMock.verifyToken).not.toHaveBeenCalled();
  });

  it('lanza UnauthorizedException cuando el header no es Bearer', async () => {
    const req: any = { headers: { authorization: 'Basic abc' } };

    await expect(guard.canActivate(buildContext(req) as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('adjunta auth, companyId, userId y role cuando el token es valido', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(null);
    clerkServiceMock.verifyToken.mockResolvedValue({
      sub: 'user_1',
      sid: 'sess_1',
      azp: 'http://localhost:4200',
      exp: 2000000000,
      iat: 1999999000,
      nbf: 1999999000,
      iss: 'https://clerk.example.com',
      role: 'admin',
      company_id: 'empresa-x',
      permissions: ['proyectos:leer'],
    });
    const req: any = { headers: { authorization: 'Bearer token-valido' } };

    const result = await guard.canActivate(buildContext(req) as any);

    expect(result).toBe(true);
    expect(req.auth?.sub).toBe('user_1');
    expect(req.companyId).toBe('empresa-x');
    expect(req.userId).toBe('user_1');
    expect(req.userRole).toBe('admin');
    expect(req.userPermissions).toEqual(['proyectos:leer']);
  });

  it('usa el companyId por defecto cuando el token no trae claim company_id', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(null);
    clerkServiceMock.verifyToken.mockResolvedValue({
      sub: 'user_1',
      sid: 'sess_1',
      azp: 'http://localhost:4200',
      exp: 2000000000,
      iat: 1999999000,
      nbf: 1999999000,
      iss: 'https://clerk.example.com',
    });
    const req: any = { headers: { authorization: 'Bearer token-valido' } };

    await guard.canActivate(buildContext(req) as any);

    expect(req.companyId).toBe('kavana_viability_executive');
  });

  it('lanza UnauthorizedException cuando el token es invalido o expirado', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(null);
    clerkServiceMock.verifyToken.mockResolvedValue(null);
    const req: any = { headers: { authorization: 'Bearer token-malo' } };

    await expect(guard.canActivate(buildContext(req) as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
