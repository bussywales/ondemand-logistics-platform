export const APP_AUTH_COOKIE = 'shipwright-app-auth';

export function isProtectedAppPath(pathname: string) {
  return pathname === '/app' || pathname.startsWith('/app/');
}

export function sanitizePostAuthDestination(value: string | null | undefined) {
  if (!value) {
    return '/app';
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('/app')) {
    return '/app';
  }

  return trimmed;
}

export function buildAuthRedirectTarget(input: { pathname: string; search?: string }) {
  const search = input.search ?? '';
  const next = `${input.pathname}${search}`;
  return `/get-started?next=${encodeURIComponent(sanitizePostAuthDestination(next))}`;
}
