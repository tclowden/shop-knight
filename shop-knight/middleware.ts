export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/sales/:path*',
    '/customers/:path*',
    '/vendors/:path*',
    '/api/opportunities/:path*',
    '/api/quotes/:path*',
    '/api/sales-orders/:path*',
    '/api/admin/users/:path*',
    '/api/sales-order-lines/:path*',
  ],
};
