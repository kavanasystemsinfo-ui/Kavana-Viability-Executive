import { extractClaims } from './claims';

/**
 * Función pura de normalización de claims. El template de sesión de Clerk
 * actual inyecta los claims dentro de metadata.* (metadata.role,
 * metadata.company_id, metadata.permissions); el formato alternativo los
 * lleva en la raíz del payload. extractClaims soporta ambos y da prioridad
 * a metadata.* (formato oficial del template).
 */
describe('extractClaims (funcion pura de normalizacion de claims)', () => {
  it('extrae role, company_id y permissions desde metadata.* (formato actual del template de sesion)', () => {
    const payload = {
      sub: 'user_3ImCPd9CkIBoHJnJQx2r2e5fLzc',
      sid: 'sess_1',
      exp: 2000000000,
      metadata: {
        role: 'super_admin',
        company_id: 'kavana_viability_executive',
        permissions: ['promotions:read', 'promotions:write'],
      },
    };

    expect(extractClaims(payload)).toEqual({
      role: 'super_admin',
      company_id: 'kavana_viability_executive',
      permissions: ['promotions:read', 'promotions:write'],
    });
  });

  it('usa los claims de la raiz como fallback cuando no hay metadata', () => {
    const payload = {
      sub: 'user_1',
      sid: 'sess_1',
      exp: 2000000000,
      role: 'admin',
      company_id: 'empresa-b',
      permissions: ['proyectos:leer'],
    };

    expect(extractClaims(payload)).toEqual({
      role: 'admin',
      company_id: 'empresa-b',
      permissions: ['proyectos:leer'],
    });
  });

  it('da prioridad a metadata.* sobre los claims de la raiz', () => {
    const payload = {
      role: 'viewer',
      company_id: 'empresa-raiz',
      metadata: {
        role: 'analista',
        company_id: 'empresa-metadata',
        permissions: ['viability:run'],
      },
    };

    expect(extractClaims(payload)).toEqual({
      role: 'analista',
      company_id: 'empresa-metadata',
      permissions: ['viability:run'],
    });
  });

  it('devuelve role y company_id undefined y permissions [] cuando no hay claims', () => {
    const result = extractClaims({
      sub: 'user_1',
      sid: 'sess_1',
      azp: 'http://localhost:4200',
      exp: 2000000000,
      iat: 1999999000,
      nbf: 1999999000,
      iss: 'https://clerk.example.com',
    });

    expect(result.role).toBeUndefined();
    expect(result.company_id).toBeUndefined();
    expect(result.permissions).toEqual([]);
  });

  it('respeta un payload vacio o nulo sin lanzar', () => {
    expect(extractClaims(null)).toEqual({
      role: undefined,
      company_id: undefined,
      permissions: [],
    });
    expect(extractClaims({})).toEqual({
      role: undefined,
      company_id: undefined,
      permissions: [],
    });
    expect(extractClaims(undefined)).toEqual({
      role: undefined,
      company_id: undefined,
      permissions: [],
    });
  });

  it('no muta el payload original ni toca los claims estandar (sub, sid, exp...)', () => {
    const payload = {
      sub: 'user_1',
      sid: 'sess_1',
      exp: 2000000000,
      iat: 1999999000,
      nbf: 1999999000,
      iss: 'https://clerk.example.com',
      metadata: { role: 'viewer' },
    };
    const snapshot = JSON.stringify(payload);

    const result = extractClaims(payload);

    expect(JSON.stringify(payload)).toBe(snapshot);
    expect(result).not.toHaveProperty('sub');
    expect(result).not.toHaveProperty('sid');
    expect(result).not.toHaveProperty('exp');
    expect(result).not.toHaveProperty('iat');
    expect(result).not.toHaveProperty('iss');
  });
});
