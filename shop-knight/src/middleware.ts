import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { canAccessPath } from '@/lib/rbac';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublicPath = pathname === '/login' || pathname.startsWith('/proofs/approve') || pathname.startsWith('/api/proofs/public/');
  const isAuthApi = pathname.startsWith('/api/auth');

  if (isPublicPath || isAuthApi) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (token && (pathname === '/admin/companies' || pathname.startsWith('/admin/companies/') || pathname.startsWith('/api/admin/companies'))) {
    const role = String(token.role || '');
    const roles = Array.isArray(token.roles) ? token.roles.map(String) : [];
    const isSuperAdmin = role === 'SUPER_ADMIN' || roles.includes('SUPER_ADMIN');
    if (!isSuperAdmin) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const permissions = Array.isArray(token.permissions) ? token.permissions.map(String) : [];
  if (!canAccessPath(pathname, permissions)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
