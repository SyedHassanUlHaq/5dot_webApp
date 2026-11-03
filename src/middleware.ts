import { NextResponse, type NextRequest } from 'next/server';

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
  return NextResponse.next();
}

export const config = {
  // Skip API routes, Next internals and files with an extension.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
