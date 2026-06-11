import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('bao_garden_token')?.value;

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const key = `${ip}:${Math.floor(Date.now() / 60000)}`; // per-minute bucket
    const count = apiCounts.get(key) || 0;
    if (count > 100) {
      return NextResponse.json(
        { success: false, error: 'Quá nhiều yêu cầu, vui lòng thử lại sau' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
    apiCounts.set(key, count + 1);
    // Cleanup old keys
    if (apiCounts.size > 1000) {
      const cutoff = `${Math.floor(Date.now() / 60000) - 2}`;
      for (const k of apiCounts.keys()) { if (k.endsWith(`:${cutoff}`) || k < cutoff) apiCounts.delete(k); }
    }
  }

  // Public routes - no auth needed
  const publicPaths = ['/booking', '/login', '/order', '/api/auth/login', '/api/bookings', '/api/tables', '/api/public'];
  const isPublicPath = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
  
  // Static assets, favicon, etc
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/tables/availability') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (pathname === '/api/bookings' && request.method === 'POST') {
    return NextResponse.next();
  }

  // Public pages
  if (isPublicPath || pathname === '/') {
    return NextResponse.next();
  }

  // Protected routes - redirect to login if no token
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

const apiCounts = new Map<string, number>();

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
