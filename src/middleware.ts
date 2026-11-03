import { NextResponse, type NextRequest } from 'next/server';
import { LEGAL_HTML_CSP, LEGAL_HTML_PATHS, buildAppCsp } from '@/lib/csp';

const RT_COOKIE = '5dot_rt';
/** Reachable while signed out. Everything else is the protected (app) area. */
export const PUBLIC = [
  '/sign-in',
  '/sign-up',
  '/verify',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/legal', // terms + cookie policy (linked from sign-up)
  '/delete-account',
  '/support',
  '/dev',
];
export const AUTH_ONLY = ['/sign-in', '/sign-up', '/verify', '/forgot-password', '/reset-password'];

export const matches = (path: string, list: string[]) =>
  list.some((p) => path === p || path.startsWith(`${p}/`));

/** Per-request CSP nonce. Next reads the nonce from the request's CSP header and stamps its own scripts with it. */
function withCsp(req: NextRequest): NextResponse {
  if (LEGAL_HTML_PATHS.includes(req.nextUrl.pathname)) {
    const res = NextResponse.next();
    res.headers.set('Content-Security-Policy', LEGAL_HTML_CSP);
    return res;
  }
  const nonce = btoa(crypto.randomUUID());
  const csp = buildAppCsp({
    nonce,
    apiBase: process.env.NEXT_PUBLIC_API_BASE_URL,
    dev: process.env.NODE_ENV !== 'production',
    production: process.env.NODE_ENV === 'production',
  });
  const headers = new Headers(req.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const signedIn = req.cookies.has(RT_COOKIE);

  if (!signedIn && !matches(pathname, PUBLIC)) {
    const url = req.nextUrl.clone();
    url.pathname = '/sign-in';
    url.search = '';
    if (pathname !== '/') url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  if (signedIn && matches(pathname, AUTH_ONLY)) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return withCsp(req);
}

export const config = {
  // Skip API routes, Next internals and files with an extension.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
