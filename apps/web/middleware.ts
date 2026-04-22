import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { APP_AUTH_COOKIE, buildAuthRedirectTarget } from './app/_lib/route-protection';

export function middleware(request: NextRequest) {
  const authenticated = request.cookies.get(APP_AUTH_COOKIE)?.value === '1';
  if (authenticated) {
    return NextResponse.next();
  }

  const redirect = new URL(buildAuthRedirectTarget({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search
  }), request.url);

  return NextResponse.redirect(redirect);
}

export const config = {
  matcher: ['/app/:path*']
};
