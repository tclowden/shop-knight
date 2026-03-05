import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/api-auth';

export async function GET(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const q = String(searchParams.get('q') || '').trim();
  if (q.length < 3) return NextResponse.json([]);

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '6');
  url.searchParams.set('countrycodes', 'us');

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'shop-knight/1.0 (address-autocomplete)',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) return NextResponse.json([]);
  const data = (await res.json()) as Array<{ display_name?: string }>;

  return NextResponse.json(
    data
      .map((d) => String(d.display_name || '').trim())
      .filter(Boolean)
  );
}
