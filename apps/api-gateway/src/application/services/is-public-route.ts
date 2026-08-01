const PUBLIC_EXACT_ROUTES: ReadonlyArray<{ method: string; path: string }> = [
  { method: 'POST', path: '/api/auth/register' },
  { method: 'POST', path: '/api/auth/login' },
  { method: 'POST', path: '/api/auth/refresh' },
];

const HEALTH_PATH_SUFFIX = /\/(health|ready)$/;

/**
 * Determina si una ruta puede pasar sin JWT: registro/login/refresh de auth-service
 * (el refresh token viaja en el body, no en el header) y cualquier healthcheck
 * (propio del gateway o proxied), sin necesidad de listar cada servicio.
 */
export function isPublicRoute(method: string, path: string): boolean {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = path.split('?')[0].replace(/\/+$/, '') || '/';

  if (HEALTH_PATH_SUFFIX.test(normalizedPath)) {
    return true;
  }

  return PUBLIC_EXACT_ROUTES.some(
    (route) => route.method === normalizedMethod && route.path === normalizedPath,
  );
}
