import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ClerkService, type VerifiedToken } from '../clerk.service';
import { DEFAULT_COMPANY_ID } from '../company-id.constants';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export interface AuthenticatedRequest extends Request {
  auth?: VerifiedToken;
  companyId: string | undefined;
  userId: string | undefined;
  userRole: string | undefined;
  userPermissions: string[] | undefined;
}

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    @Inject(ClerkService) private readonly clerkService: ClerkService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Las rutas marcadas con @Public() quedan fuera del guard global.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7); // Quita el prefijo 'Bearer '

    // Verifica el token con Clerk (JWKS remoto)
    const verified = await this.clerkService.verifyToken(token);
    if (!verified) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Adjunta el contexto autenticado para los handlers y el RolesGuard
    request.auth = verified;
    request.companyId = verified.company_id || DEFAULT_COMPANY_ID;
    request.userId = verified.sub;
    request.userRole = verified.role;
    request.userPermissions = verified.permissions || [];

    return true;
  }
}
