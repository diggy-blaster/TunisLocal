import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if the path includes '/admin' (catches /en/admin, /fr/admin, etc.)
  if (pathname.includes('/admin')) {
    // Securely retrieve the session token
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL('/en/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }

    // OPTIONAL: If you have an admin role, uncomment the next 4 lines:
    // if (token.role !== 'admin') {
    //   return NextResponse.redirect(new URL('/en/unauthorized', req.url));
    // }
  }

  return NextResponse.next();
}

// Apply middleware to all paths except static files and API routes (unless specified)
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};