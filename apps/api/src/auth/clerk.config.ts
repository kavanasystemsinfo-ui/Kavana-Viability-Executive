import type { createClerkClient } from '@clerk/clerk-sdk-node';
import { registerAs } from '@nestjs/config';

export const clerkConfig = registerAs('clerk', () => ({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
  secretKey: process.env.CLERK_SECRET_KEY || '',
  apiUrl: process.env.CLERK_API_URL || 'https://api.clerk.com',
  jwtKey: process.env.CLERK_JWT_KEY || '',

  // Configuración de webhook (verificación de firma Svix)
  webhookSecret: process.env.CLERK_WEBHOOK_SECRET || '',

  // Orígenes permitidos para CORS
  allowedOrigins: (
    process.env.CLERK_ALLOWED_ORIGINS ||
    'http://localhost:4200,https://kavana-viability-executive.vercel.app'
  ).split(','),

  // Mapeo de roles desde metadata de Clerk a roles internos
  roleMapping: {
    super_admin: 'super_admin',
    admin: 'admin',
    director: 'director',
    jefe_proyecto: 'jefe_proyecto',
    analista: 'analista',
    comercial: 'comercial',
    viewer: 'viewer',
  },

  // Rol por defecto para nuevos usuarios
  defaultRole: 'viewer',

  // Claim del token que transporta el company_id
  companyIdClaim: 'company_id',

  // Opciones de verificación del token
  verifyOptions: {
    clockSkewInSeconds: 30,
    authorizedParties: process.env.CLERK_AUTHORIZED_PARTIES?.split(',') || [],
    // issuer null: el SDK deriva el emisor del propio token (emisores múltiples)
    issuer: null,
  },
}));

export type ClerkConfig = ReturnType<typeof clerkConfig> & {
  roleMapping: Record<string, string>;
};
export type ClerkClientType = ReturnType<typeof createClerkClient>;
