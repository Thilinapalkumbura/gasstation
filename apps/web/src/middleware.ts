import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't need auth
const PUBLIC_PATHS = ['/login', '/api'];

// Role-based path prefixes
const ROLE_PATHS: Record<string, string[]> = {
  ADMIN: ['/admin', '/backoffice', '/manager', '/worker'],
  BACK_OFFICE: ['/backoffice'],
  STATION_MANAGER: ['/manager'],
  WORKER: ['/worker'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for session storage auth — this is handled client-side
  // Middleware uses a lightweight cookie-based check
  const token = request.cookies.get('gs-authenticated')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg).*)',
  ],
};
