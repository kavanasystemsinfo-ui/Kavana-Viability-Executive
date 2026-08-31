import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request } from 'express';
import { DEFAULT_COMPANY_ID } from '../company-id.constants';

export type CompanyIdRequest = Request & { companyId?: string };

@Injectable()
export class CompanyIdMiddleware implements NestMiddleware {
  use(req: CompanyIdRequest, _res: unknown, next: NextFunction) {
    // El ClerkAuthGuard ya fija companyId desde el claim del token cuando hay
    // sesión. Este middleware solo garantiza que siempre exista un valor:
    // 1) el ya establecido por el guard, 2) el header x-company-id (llamadas
    // service-to-service), 3) la empresa por defecto.
    if (req.companyId) {
      next();
      return;
    }

    const headerCompanyId = req.headers['x-company-id'];
    if (typeof headerCompanyId === 'string' && headerCompanyId.length > 0) {
      req.companyId = headerCompanyId;
    } else {
      req.companyId = DEFAULT_COMPANY_ID;
    }

    next();
  }
}
