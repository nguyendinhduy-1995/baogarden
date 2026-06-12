import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Route → allowed roles mapping
const ROUTE_ROLES: Record<string, string[]> = {
  '/admin': ['ADMIN', 'MANAGER'],
  '/manager': ['ADMIN', 'MANAGER'],
  '/kitchen': ['ADMIN', 'MANAGER', 'KITCHEN'],
  '/bar': ['ADMIN', 'MANAGER', 'BAR'],
  '/cashier': ['ADMIN', 'MANAGER', 'CASHIER'],
  '/waiter': ['ADMIN', 'MANAGER', 'WAITER'],
  '/reception': ['ADMIN', 'MANAGER', 'RECEPTION'],
  '/booking-staff': ['ADMIN', 'MANAGER', 'BOOKING'],
  '/marketing': ['ADMIN', 'MANAGER', 'MARKETING'],
};

/** Decode JWT payload (base64url) without verification — signature is verified in API routes */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const json = atob(payload);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const apiCounts = new Map<string, number>();

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('bao_garden_token')?.value;

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const bucket = Math.floor(Date.now() / 60000);
    const key = `${ip}:${bucket}`;
    const count = apiCounts.get(key) || 0;
    if (count > 100) {
      return NextResponse.json(
        { success: false, error: 'Quá nhiều yêu cầu, vui lòng thử lại sau' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
    apiCounts.set(key, count + 1);
    // Cleanup old keys — compare bucket timestamps numerically
    if (apiCounts.size > 1000) {
      const cutoff = bucket - 2;
      for (const k of apiCounts.keys()) {
        const ts = Number(k.split(':').pop());
        if (ts < cutoff) apiCounts.delete(k);
      }
    }
  }

  // Public routes - no auth needed
  const publicPaths = ['/booking', '/login', '/order', '/guide', '/api/auth/login', '/api/bookings', '/api/tables', '/api/public', '/api/events'];
  const isPublicPath = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'));

  // Static assets — only bypass known file extensions
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/tables/availability') || pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|webp|avif|mp4|webm)$/i)) {
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

  // Role-based access control for protected page routes
  const matchedRoute = Object.keys(ROUTE_ROLES).find(
    route => pathname === route || pathname.startsWith(route + '/')
  );

  if (matchedRoute) {
    const payload = decodeJwtPayload(token);
    const role = payload?.role as string | undefined;

    if (!role || !ROUTE_ROLES[matchedRoute].includes(role)) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
