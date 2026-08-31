import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';

/**
 * Restringe el acceso de una ruta a un conjunto de roles.
 * El RolesGuard aplica la jerarquía: un rol superior también pasa.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Restringe el acceso de una ruta a usuarios que tengan todos los permisos
 * indicados. Los permisos se leen del claim `permissions` del token de Clerk.
 */
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
