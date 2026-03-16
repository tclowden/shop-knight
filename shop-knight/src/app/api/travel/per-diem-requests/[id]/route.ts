import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';
import { dateDiffDays, fetchGsaPerDiem, getGsaApiKeyFromEnv, getTripYear, normalizeStateCode, retryPerDiem } from '@/lib/per-diem';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const item = await prisma.perDiemRequest.findFirst({
    where: withCompany(companyId, { id }),
    include: { trip: { include: { travelers: { include: { traveler: true } } } }, createdByUser: true },
  });

  if (!item) return NextResponse.json({ error: 'Per-diem request not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.perDiemRequest.findFirst({ where: withCompany(companyId, { id }), include: { trip: { include: { travelers: true } } } });
  if (!existing) return NextResponse.json({ error: 'Per-diem request not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const nextStatus = body?.status ? String(body.status) : null;
  const notes = body?.notes !== undefined ? String(body.notes || '') : undefined;

  const role = String((auth.session.user as { role?: string } | undefined)?.role || '');
  const roles = Array.isArray((auth.session.user as { roles?: string[] } | undefined)?.roles)
    ? ((auth.session.user as { roles?: string[] } | undefined)?.roles || []).map(String)
    : [];
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN' || roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

  let recomputeData: Record<string, unknown> = {};

  let manualRateData: Record<string, unknown> = {};
  if (body?.dailyRate !== undefined) {
    if (!isAdmin) return NextResponse.json({ error: 'Only admins can override M&IE daily rate.' }, { status: 403 });
    const rate = Number(body.dailyRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json({ error: 'dailyRate must be a positive number.' }, { status: 400 });
    }
    const days = Number(existing.days || 0) > 0 ? Number(existing.days) : dateDiffDays(existing.trip.startDate, existing.trip.endDate);
    const travelerCount = Number(existing.travelerCount || 0) > 0 ? Number(existing.travelerCount) : Math.max(1, existing.trip.travelers.length || 1);
    manualRateData = {
      dailyRate: rate,
      days,
      travelerCount,
      total: rate * days * travelerCount,
    };
  }
  if (body?.action === 'recompute') {
    const apiKey = getGsaApiKeyFromEnv();
    if (!apiKey) return NextResponse.json({ error: 'GSA API key missing' }, { status: 400 });

    const city = String(existing.trip.destinationCity || '').trim();
    const state = normalizeStateCode(existing.trip.destinationState);
    if (!city || !state) {
      return NextResponse.json({ error: 'Trip destination city/state required to recompute.' }, { status: 400 });
    }

    const year = getTripYear(existing.trip.startDate, existing.trip.endDate);
    let rateEntry: { months?: { month?: Array<{ number?: number; value?: number }> } } | null = null;
    let mie = 0;
    let yearUsed = year;

    try {
      const gsa = await retryPerDiem(() => fetchGsaPerDiem(city, state, year, apiKey), 3, 400);
      rateEntry = gsa.rateEntry;
      mie = gsa.mie;
      yearUsed = gsa.yearUsed;
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
      rateEntry = { months: { month: [] } };
    }

    const tripMonth = (existing.trip.startDate || existing.trip.endDate || new Date()).getMonth() + 1;
    const monthRates = (rateEntry as { months?: { month?: Array<{ number?: number; value?: number; amount?: number; rate?: number }> } } | null)?.months?.month;
    const monthArray = Array.isArray(monthRates) ? monthRates : [];
    const lodgingForMonth = monthArray.find((m) => Number(m?.number) === tripMonth);
    const lodgingRate = Number(lodgingForMonth?.value ?? lodgingForMonth?.amount ?? lodgingForMonth?.rate ?? 0);

    const days = dateDiffDays(existing.trip.startDate, existing.trip.endDate);
    const travelerCount = Math.max(1, existing.trip.travelers.length || 1);
    const total = mie * days * travelerCount;

    recomputeData = {
      year: yearUsed,
      dailyRate: mie,
      lodgingRate: Number.isFinite(lodgingRate) && lodgingRate > 0 ? lodgingRate : null,
      days,
      travelerCount: existing.trip.travelers.length,
      total,
      destinationCity: city,
      destinationState: state,
    };
  }

  const updated = await prisma.perDiemRequest.update({
    where: { id: existing.id },
    data: {
      status: nextStatus ? (nextStatus as 'NEW' | 'IN_REVIEW' | 'COMPLETE' | 'CANCELED') : undefined,
      completedAt: nextStatus === 'COMPLETE' ? new Date() : (nextStatus ? null : undefined),
      canceledAt: nextStatus === 'CANCELED' ? new Date() : (nextStatus ? null : undefined),
      notes,
      ...recomputeData,
      ...manualRateData,
    },
    include: { trip: { include: { travelers: { include: { traveler: true } } } }, createdByUser: true },
  });

  return NextResponse.json(updated);
}
