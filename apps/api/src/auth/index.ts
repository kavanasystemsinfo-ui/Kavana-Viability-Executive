// Auth module exports
export * from './clerk-auth.module';
export * from './clerk-webhook.controller';
export * from './clerk.config';
export * from './clerk.service';
export * from './company-id.constants';
export * from './decorators/public.decorator';
export * from './decorators/roles.decorator';
export * from './guards/clerk-auth.guard';
export * from './guards/roles.guard';
export * from './middleware/company-id.middleware';

// Interfaces
export type {
  ClerkPublicMetadata,
  ClerkUser,
  SyncedLocalUser,
  VerifiedToken,
} from './clerk.service';
export type { AuthenticatedRequest } from './guards/clerk-auth.guard';
export type { CompanyIdRequest } from './middleware/company-id.middleware';
