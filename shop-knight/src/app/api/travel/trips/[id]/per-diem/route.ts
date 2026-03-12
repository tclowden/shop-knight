import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';
import { dateDiffDays, fetchGsaPerDiem, getTripYear, normalizeStateCode } from '@/lib/per-diem';

async function retry<T>(fn: () => Promise<T>, attempts = 2, waitMs = 250): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw lastError;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({}));

    const { id } = await params;
    const trip = await retry(() => prisma.trip.findFirst({
      where: withCompany(companyId, { id }),
      include: { travelers: { include: { traveler: true } } },
    }), 3, 300);

    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

    const apiKey = process.env.GSA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GSA API key missing. Set GSA_API_KEY in environment.' }, { status: 400 });
    }

    const city = (body?.destinationCity ? String(body.destinationCity) : trip.destinationCity)?.trim() || null;
    const state = normalizeStateCode(body?.destinationState ? String(body.destinationState) : trip.destinationState);
    if (!city || !state) {
      return NextResponse.json({ error: 'Trip destination city and state are required for per-diem lookup.' }, { status: 400 });
    }

    if (city !== trip.destinationCity || state !== normalizeStateCode(trip.destinationState)) {
      await retry(() => prisma.trip.update({
        where: { id: trip.id },
        data: { destinationCity: city, destinationState: state },
      }), 2, 250);
    }

    const year = getTripYear(trip.startDate, trip.endDate);

    let rateEntry: { months?: { month?: Array<{ number?: number; value?: number }> }; county?: string } | null = null;
    let mie = 0;
    let yearUsed = year;
    let usedFallback = false;
    let fallbackNote: string | null = null;
    try {
      const gsa = await retry(() => fetchGsaPerDiem(city, state, year, apiKey), 3, 400);
      rateEntry = gsa.rateEntry;
      mie = gsa.mie;
      yearUsed = gsa.yearUsed;
      if (gsa.fallbackUsed) {
        usedFallback = true;
        fallbackNote = `Used ${yearUsed} GSA rates because ${year} is not available yet.`;
      }
    } catch (error) {
      const cached = await prisma.perDiemRequest.findFirst({
        where: withCompany(companyId, { destinationCity: city, destinationState: state, year: yearUsed }),
        orderBy: { updatedAt: 'desc' },
      });
      if (!cached?.dailyRate) {
        const message = error instanceof Error ? error.message : 'Failed per-diem lookup';
        return NextResponse.json({ error: `${message} (no cached rate available)` }, { status: 504 });
      }
      mie = Number(cached.dailyRate);
      rateEntry = { county: undefined, months: { month: [] } };
      usedFallback = true;
      fallbackNote = 'Used cached per-diem rate due to temporary GSA lookup failure.';
    }

    const tripMonth = (trip.startDate || trip.endDate || new Date()).getMonth() + 1;
    const monthRates = rateEntry?.months?.month;
    const monthArray = Array.isArray(monthRates) ? monthRates : [];
    const lodgingForMonth = monthArray.find((m: { number?: number; value?: number }) => Number(m?.number) === tripMonth);
    const lodgingRate = Number(lodgingForMonth?.value ?? 0);

    if (!Number.isFinite(mie) || mie <= 0) {
      return NextResponse.json({ error: 'GSA response did not include a valid M&IE rate.' }, { status: 422 });
    }

    const days = dateDiffDays(trip.startDate, trip.endDate);
    const travelerCount = Math.max(1, trip.travelers.length || 1);
    const total = mie * days * travelerCount;

    const userId = (auth.session.user as { id?: string } | undefined)?.id || null;
    const request = await retry(() => prisma.perDiemRequest.create({
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
        createdByUserId: userId,
      },
      select: { id: true, status: true },
    }), 3, 300);

    return NextResponse.json({
      ok: true,
      reviewer: 'Eden Riffe',
      destination: `${city}, ${state}`,
      year,
      month: tripMonth,
      county: rateEntry?.county || null,
      days,
      dailyRate: mie,
      lodgingRate: Number.isFinite(lodgingRate) && lodgingRate > 0 ? lodgingRate : null,
      travelerCount: trip.travelers.length,
      total,
      requestId: request.id,
      requestStatus: request.status,
      source: usedFallback ? 'Cached Per-Diem Rate' : 'GSA Per Diem API',
      note: fallbackNote,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.toLowerCase().includes('timed out')) {
      return NextResponse.json({ error: 'Per-diem request timed out while saving. Please retry.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Per-diem request failed due to a temporary server/database timeout. Please retry.' }, { status: 503 });
  }
}
