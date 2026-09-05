import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import type { Role } from './role.enum';

/**
 * Guard that checks if the user has one of the required roles
 */
export const roleGuard = (...roles: Role[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const userRole = authService.role$();
    return roles.some((role) => userRole === role);
  };
};
