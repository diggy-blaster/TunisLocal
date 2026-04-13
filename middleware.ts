import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'fr', 'ar'],
  defaultLocale: 'en',
  localeDetection: true,
});

export default function middleware(req) {
  const intlResponse = intlMiddleware(req);
  const url = req.nextUrl.clone();

  // 🔒 Simple admin guard (extend with NextAuth session verification in production)
  if (url.pathname.startsWith('/admin')) {
    const token = req.cookies.get('next-auth.session-token');
    if (!token) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return intlResponse;
}

export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] };