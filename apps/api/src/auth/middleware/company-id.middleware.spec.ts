import { DEFAULT_COMPANY_ID } from '../company-id.constants';
import { CompanyIdMiddleware } from './company-id.middleware';

describe('CompanyIdMiddleware', () => {
  let middleware: CompanyIdMiddleware;

  beforeEach(() => {
    middleware = new CompanyIdMiddleware();
  });

  it('mantiene el companyId ya establecido por el guard', () => {
    const req: any = { companyId: 'empresa-ya-set' };
    const next = jest.fn();

    middleware.use(req, {} as any, next);

    expect(req.companyId).toBe('empresa-ya-set');
    expect(next).toHaveBeenCalled();
  });

  it('usa el header x-company-id cuando no hay companyId previo', () => {
    const req: any = { headers: { 'x-company-id': 'empresa-header' } };
    const next = jest.fn();

    middleware.use(req, {} as any, next);

    expect(req.companyId).toBe('empresa-header');
    expect(next).toHaveBeenCalled();
  });

  it('aplica el companyId por defecto cuando no hay previo ni header', () => {
    const req: any = { headers: {} };
    const next = jest.fn();

    middleware.use(req, {} as any, next);

    expect(req.companyId).toBe(DEFAULT_COMPANY_ID);
    expect(next).toHaveBeenCalled();
  });
});
