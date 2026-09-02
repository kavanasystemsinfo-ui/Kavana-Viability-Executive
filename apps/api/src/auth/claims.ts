/**
 * Extracción y normalización de claims personalizados del JWT de Clerk.
 *
 * El template de sesión actual de Clerk inyecta los claims dentro de
 * metadata.* (metadata.role, metadata.company_id, metadata.permissions);
 * el formato alternativo los lleva en la raíz del payload. extractClaims
 * soporta ambos formatos y da prioridad a metadata.* (formato oficial).
 *
 * Función pura: no muta el payload y no depende de estado externo.
 */

export interface ExtractedClaims {
  role: string | undefined;
  company_id: string | undefined;
  permissions: string[];
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export function extractClaims(
  payload: Record<string, unknown> | null | undefined,
): ExtractedClaims {
  const root = payload ?? {};
  const metadata =
    root.metadata && typeof root.metadata === 'object' && !Array.isArray(root.metadata)
      ? (root.metadata as Record<string, unknown>)
      : {};

  const metadataPermissions = asStringArray(metadata.permissions);
  const rootPermissions = asStringArray(root.permissions);

  return {
    role: asString(metadata.role) ?? asString(root.role),
    company_id: asString(metadata.company_id) ?? asString(root.company_id),
    permissions: metadataPermissions.length > 0 ? metadataPermissions : rootPermissions,
  };
}
