import createMiddleware from 'next-intl/middleware';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'fr', 'ar'],
  defaultLocale: 'en',
  localeDetection: true,
});

export async function middleware(req) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  const localeMatch = pathname.match(/^\/(en|fr|ar)(\/|$)/);
  const normalizedPath = localeMatch
    ? pathname.replace(new RegExp(`^/${localeMatch[1]}`), '')
    : pathname;

  if (normalizedPath.startsWith('/admin')) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || token.role !== 'admin') {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/en/login';
      return NextResponse.redirect(redirectUrl);
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};