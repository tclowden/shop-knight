import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';
import { dateDiffDays, fetchGsaPerDiem, getGsaApiKeyFromEnv, getTripYear } from '@/lib/per-diem';

export async function GET(req: Request) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const where = status === 'ALL'
    ? withCompany(companyId)
    : status
      ? withCompany(companyId, { status: status as 'NEW' | 'IN_REVIEW' | 'COMPLETE' | 'CANCELED' })
      : withCompany(companyId, { NOT: { status: 'COMPLETE' as const } });

  const items = await prisma.perDiemRequest.findMany({
    where,
    include: { trip: true, createdByUser: true },
    orderBy: [{ createdAt: 'desc' }],
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const apiKey = getGsaApiKeyFromEnv();
  if (!apiKey) return NextResponse.json({ error: 'GSA API key missing' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const tripId = String(body?.tripId || '');
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 });

  const trip = await prisma.trip.findFirst({ where: withCompany(companyId, { id: tripId }), include: { travelers: true } });
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  if (!trip.destinationCity || !trip.destinationState) {
    return NextResponse.json({ error: 'Trip destination city/state required before creating per-diem request.' }, { status: 400 });
  }

  const year = getTripYear(trip.startDate, trip.endDate);
  let gsa: { rateEntry: { months?: { month?: Array<{ number?: number; value?: number }> } | undefined }; mie: number; yearUsed: number; fallbackUsed: boolean };
  try {
    gsa = await fetchGsaPerDiem(trip.destinationCity, trip.destinationState, year, apiKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed per-diem lookup';
    return NextResponse.json({ error: message }, { status: 504 });
  }

  const tripMonth = (trip.startDate || trip.endDate || new Date()).getMonth() + 1;
  const monthRates = gsa.rateEntry?.months?.month;
  const monthArray = Array.isArray(monthRates) ? monthRates : [];
  const lodgingForMonth = monthArray.find((m) => Number(m?.number) === tripMonth);
  const lodgingRate = Number(lodgingForMonth?.value ?? 0);

  const days = dateDiffDays(trip.startDate, trip.endDate);
  const travelerCount = Math.max(1, trip.travelers.length || 1);
  const total = gsa.mie * days * travelerCount;

  const userId = (auth.session.user as { id?: string } | undefined)?.id || null;
  const created = await prisma.perDiemRequest.create({
    data: {
      companyId,
      tripId: trip.id,
      status: 'NEW',
      destinationCity: trip.destinationCity,
      destinationState: trip.destinationState,
      year: gsa.yearUsed,
      dailyRate: gsa.mie,
      lodgingRate: Number.isFinite(lodgingRate) && lodgingRate > 0 ? lodgingRate : null,
      days,
      travelerCount: trip.travelers.length,
      total,
      notes: body?.notes ? String(body.notes) : null,
      createdByUserId: userId,
    },
    include: { trip: true, createdByUser: true },
  });

  return NextResponse.json(created, { status: 201 });
}
