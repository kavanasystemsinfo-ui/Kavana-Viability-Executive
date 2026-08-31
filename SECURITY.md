# SECURITY.md

## Reportar una vulnerabilidad

Este repo es privado y está en desarrollo. Si encuentras una vulnerabilidad (acceso, secretos, inyección, SSRF, etc.):

1. **No la divulges públicamente**.
2. Crea un issue privado en este repo o avisa directamente al mantenedor por el canal acordado.
3. Incluye: descripción, pasos para reproducir, impacto estimado.

## Política de secretos

- **Nunca** se commitean `.env`, tokens ni claves (el `.gitignore` excluye `.env.*` salvo `.env.example`).
- Las claves de Clerk viven en el entorno local (`apps/api/.env.local`) y, en despliegue, en las env vars de Vercel/Render o como secrets de GitHub Actions.
- Los hooks de pre-commit/pre-push (perfil Kavana) filtran commits con basura o secretos antes de llegar al remoto.

## Entorno

- API: todos los endpoints son privados por defecto (guards globales) salvo `POST /api/webhooks/clerk`, protegido por verificación de firma Svix sobre el cuerpo crudo.
- CORS restringido a orígenes declarados (localhost:4200 y el dominio de producción).
- La verificación de tokens de sesión se hace contra Clerk en cada petición; no hay sesiones locales que gestionar.