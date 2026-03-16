import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';
import { dateDiffDays, fetchGsaPerDiem, getGsaApiKeyFromEnv, getTripYear, normalizeStateCode, retryPerDiem } from '@/lib/per-diem';

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

  const trip = await retryPerDiem(() => prisma.trip.findFirst({ where: withCompany(companyId, { id: tripId }), include: { travelers: true } }));
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const city = String(trip.destinationCity || '').trim();
  const state = normalizeStateCode(trip.destinationState);
  if (!city || !state) {
    return NextResponse.json({ error: 'Trip destination city/state required before creating per-diem request.' }, { status: 400 });
  }

  const year = getTripYear(trip.startDate, trip.endDate);
  let rateEntry: { months?: { month?: Array<{ number?: number; value?: number }> }; county?: string } | null = null;
  let mie = 0;
  let yearUsed = year;
  let fallbackNote: string | null = null;

  try {
    const gsa = await retryPerDiem(() => fetchGsaPerDiem(city, state, year, apiKey), 3, 400);
    rateEntry = gsa.rateEntry;
    mie = gsa.mie;
    yearUsed = gsa.yearUsed;
    if (gsa.fallbackUsed) {
      fallbackNote = `Used ${yearUsed} GSA rates because ${year} is not available yet.`;
    }
  } catch (error) {
    const cached = await prisma.perDiemRequest.findFirst({
      where: withCompany(companyId, { destinationCity: city, destinationState: state }),
      orderBy: [{ year: 'desc' }, { updatedAt: 'desc' }],
    });
    if (!cached?.dailyRate) {
      const message = error instanceof Error ? error.message : 'Failed per-diem lookup';
      return NextResponse.json({ error: `${message} (no cached rate available)` }, { status: 504 });
    }
    mie = Number(cached.dailyRate);
    yearUsed = Number(cached.year) > 0 ? Number(cached.year) : year;
    rateEntry = { county: undefined, months: { month: [] } };
    fallbackNote = `Used cached per-diem rate (${yearUsed}) due to temporary GSA lookup failure.`;
  }

  const tripMonth = (trip.startDate || trip.endDate || new Date()).getMonth() + 1;
  const monthRates = (rateEntry as { months?: { month?: Array<{ number?: number; value?: number; amount?: number; rate?: number }> } } | null)?.months?.month;
  const monthArray = Array.isArray(monthRates) ? monthRates : [];
  const lodgingForMonth = monthArray.find((m) => Number(m?.number) === tripMonth);
  const lodgingRate = Number(lodgingForMonth?.value ?? lodgingForMonth?.amount ?? lodgingForMonth?.rate ?? 0);

  if (!Number.isFinite(mie) || mie <= 0) {
    return NextResponse.json({ error: 'GSA response did not include a valid M&IE rate.' }, { status: 422 });
  }

  const days = dateDiffDays(trip.startDate, trip.endDate);
  const travelerCount = Math.max(1, trip.travelers.length || 1);
  const total = mie * days * travelerCount;

  const userId = (auth.session.user as { id?: string } | undefined)?.id || null;
  const created = await prisma.perDiemRequest.create({
    data: {
      companyId,
      tripId: trip.id,
      status: 'NEW',
      destinationCity: city,
      destinationState: state,
      year: yearUsed,
      dailyRate: mie,
      lodgingRate: Number.isFinite(lodgingRate) && lodgingRate > 0 ? lodgingRate : null,
      days,
      travelerCount: trip.travelers.length,
      total,
      notes: [body?.notes ? String(body.notes) : null, fallbackNote].filter(Boolean).join('\n') || null,
      createdByUserId: userId,
    },
    include: { trip: true, createdByUser: true },
  });

  return NextResponse.json(created, { status: 201 });
}
