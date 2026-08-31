import { ForbiddenException } from '@nestjs/common';
import { PERMISSIONS_KEY, ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflectorMock: { getAllAndOverride: jest.Mock };

  const buildContext = (req: any) => ({
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  });

  beforeEach(() => {
    reflectorMock = { getAllAndOverride: jest.fn().mockReturnValue(null) };
    guard = new RolesGuard(reflectorMock as any);
  });

  it('permite el acceso cuando no hay roles ni permisos requeridos', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(undefined);
    const req: any = { userRole: 'viewer', userPermissions: [] };

    const result = guard.canActivate(buildContext(req) as any);

    expect(result).toBe(true);
  });

  it('respeta la jerarquia: super_admin puede acceder a rutas de admin', () => {
    reflectorMock.getAllAndOverride.mockImplementation((key: string) =>
      key === ROLES_KEY ? ['admin'] : undefined,
    );
    const req: any = { userRole: 'super_admin', userPermissions: [] };

    expect(guard.canActivate(buildContext(req) as any)).toBe(true);
  });

  it('deniega a un rol inferior: viewer no accede a rutas de admin', () => {
    reflectorMock.getAllAndOverride.mockImplementation((key: string) =>
      key === ROLES_KEY ? ['admin'] : undefined,
    );
    const req: any = { userRole: 'viewer', userPermissions: [] };

    expect(() => guard.canActivate(buildContext(req) as any)).toThrow(ForbiddenException);
  });

  it('permite a un rol superior acceder a rutas de viewer', () => {
    reflectorMock.getAllAndOverride.mockImplementation((key: string) =>
      key === ROLES_KEY ? ['viewer'] : undefined,
    );
    const req: any = { userRole: 'super_admin', userPermissions: [] };

    expect(guard.canActivate(buildContext(req) as any)).toBe(true);
  });

  it('permite el acceso cuando el usuario tiene todos los permisos requeridos', () => {
    reflectorMock.getAllAndOverride.mockImplementation((key: string) =>
      key === PERMISSIONS_KEY ? ['proyectos:crear', 'proyectos:leer'] : undefined,
    );
    const req: any = {
      userRole: 'analista',
      userPermissions: ['proyectos:crear', 'proyectos:leer'],
    };

    expect(guard.canActivate(buildContext(req) as any)).toBe(true);
  });

  it('deniega el acceso cuando falta algun permiso requerido', () => {
    reflectorMock.getAllAndOverride.mockImplementation((key: string) =>
      key === PERMISSIONS_KEY ? ['proyectos:crear'] : undefined,
    );
    const req: any = { userRole: 'analista', userPermissions: ['proyectos:leer'] };

    expect(() => guard.canActivate(buildContext(req) as any)).toThrow(ForbiddenException);
  });

  it('exige cumplir roles y permisos a la vez', () => {
    reflectorMock.getAllAndOverride.mockImplementation((key: string) => {
      if (key === ROLES_KEY) return ['director'];
      if (key === PERMISSIONS_KEY) return ['informes:leer'];
      return undefined;
    });
    const req: any = {
      userRole: 'director',
      userPermissions: ['informes:leer'],
    };

    expect(guard.canActivate(buildContext(req) as any)).toBe(true);
  });
});
