import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

function dateDiffDays(start: Date | null, end: Date | null) {
  if (!start || !end) return 1;
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1);
}

function getTripYear(startDate: Date | null, endDate: Date | null) {
  return (startDate || endDate || new Date()).getFullYear();
}

function normalizeStateCode(value: string | null | undefined) {
  if (!value) return null;
  return String(value).trim().toUpperCase();
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const trip = await prisma.trip.findFirst({
    where: withCompany(companyId, { id }),
    include: { travelers: { include: { traveler: true } } },
  });

  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const apiKey = process.env.GSA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GSA API key missing. Set GSA_API_KEY in environment.' }, { status: 400 });
  }

  const city = trip.destinationCity?.trim() || null;
  const state = normalizeStateCode(trip.destinationState);
  if (!city || !state) {
    return NextResponse.json({ error: 'Trip destination city and state are required for per-diem lookup.' }, { status: 400 });
  }

  const year = getTripYear(trip.startDate, trip.endDate);
  const url = `https://api.gsa.gov/travel/perdiem/v2/rates/city/${encodeURIComponent(city)}/state/${encodeURIComponent(state)}/year/${year}?api_key=${encodeURIComponent(apiKey)}`;

  const gsaRes = await fetch(url, { method: 'GET', cache: 'no-store' });
  const gsaData = await gsaRes.json().catch(() => null);

  if (!gsaRes.ok || !gsaData?.rates || !Array.isArray(gsaData.rates) || gsaData.rates.length === 0) {
    return NextResponse.json({
      error: `No per-diem rates found for ${city}, ${state} (${year}).`,
      gsaStatus: gsaRes.status,
    }, { status: 404 });
  }

  const rateContainer = gsaData.rates[0];
  const rateEntry = Array.isArray(rateContainer?.rate) ? rateContainer.rate[0] : null;
  const mie = Number(rateEntry?.meals ?? 0);

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
    source: 'GSA Per Diem API',
  });
}
