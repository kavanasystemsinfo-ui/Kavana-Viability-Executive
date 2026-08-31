import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from './clerk-auth.guard';

/**
 * Jerarquía de roles de negocio, en orden descendente de privilegios.
 * Un rol con índice menor puede acceder a rutas de cualquier rol con índice
 * mayor o igual (super_admin accede a todo).
 */
const ROLE_HIERARCHY = [
  'super_admin',
  'admin',
  'director',
  'jefe_proyecto',
  'analista',
  'comercial',
  'viewer',
];

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Roles exigidos por la ruta (decorador @Roles)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Permisos exigidos por la ruta (decorador @Permissions)
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Sin restricciones en la ruta: acceso libre (una vez autenticado)
    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userRole = request.userRole;
    const userPermissions = request.userPermissions || [];

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((role) => this.roleMatches(userRole, role));
      if (!hasRole) {
        throw new ForbiddenException(
          `Required role: one of [${requiredRoles.join(', ')}], got: ${userRole ?? 'none'}`,
        );
      }
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const missing = requiredPermissions.filter((perm) => !userPermissions.includes(perm));
      if (missing.length > 0) {
        throw new ForbiddenException(`Missing required permissions: ${missing.join(', ')}`);
      }
    }

    return true;
  }

  private roleMatches(userRole: string | undefined, requiredRole: string): boolean {
    if (!userRole) {
      return false;
    }
    const userIndex = ROLE_HIERARCHY.indexOf(userRole);
    const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole);

    // Roles no reconocidos solo se satisfacen por igualdad exacta
    if (userIndex === -1 || requiredIndex === -1) {
      return userRole === requiredRole;
    }

    // Índice menor o igual = más privilegios: pasa
    return userIndex <= requiredIndex;
  }
}
