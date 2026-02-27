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
    '/api/admin/products/:path*',
    '/api/sales-order-lines/:path*',
    '/api/quote-lines/:path*',
    '/api/quotes/:path*/lines/reorder',
    '/api/sales-orders/:path*/lines/reorder',
    '/api/notes/:path*',
    '/api/tasks/:path*',
    '/api/users/:path*',
  ],
};
