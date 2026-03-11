import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/api-auth';

type InputItem = { id: string; location: string };

type CacheEntry = { lat: number; lon: number; at: number };
const geoCache = new Map<string, CacheEntry>();
const TTL_MS = 1000 * 60 * 60 * 24;

async function geocode(location: string) {
  const key = location.trim().toLowerCase();
  const cached = geoCache.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) return cached;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', location);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'shop-knight/1.0 (travel-map-geocoder)',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ lat?: string; lon?: string }>;
  if (!rows[0]?.lat || !rows[0]?.lon) return null;

  const parsed = { lat: Number(rows[0].lat), lon: Number(rows[0].lon), at: Date.now() };
  if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lon)) return null;
  geoCache.set(key, parsed);
  return parsed;
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const items = (Array.isArray(body?.items) ? body.items : []) as InputItem[];
  const sanitized = items
    .map((i) => ({ id: String(i?.id || ''), location: String(i?.location || '').trim() }))
    .filter((i) => i.id && i.location)
    .slice(0, 100);

  const out: Array<{ id: string; lat: number; lon: number; location: string }> = [];
  for (const item of sanitized) {
    const geo = await geocode(item.location);
    if (!geo) continue;
    out.push({ id: item.id, lat: geo.lat, lon: geo.lon, location: item.location });
  }

  return NextResponse.json({ points: out });
}
