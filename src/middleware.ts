import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  // Allow auth routes
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    if (pathname === '/login' && token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    // Tag login page so server component can detect it
    const response = NextResponse.next();
    response.headers.set('x-page-path', pathname);
    return response;
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Check authentication
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Tag authenticated pages
  const response = NextResponse.next();
  response.headers.set('x-page-path', pathname);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
