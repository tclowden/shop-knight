import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

function dateDiffDays(start: Date | null, end: Date | null) {
  if (!start || !end) return 1;
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1);
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

  const days = dateDiffDays(trip.startDate, trip.endDate);
  const dailyRate = 69; // placeholder until GSA API integration
  const total = dailyRate * days * Math.max(1, trip.travelers.length || 1);

  return NextResponse.json({
    ok: true,
    phase: 'skeleton',
    reviewer: 'Eden Riffe',
    destination: trip.destinations,
    days,
    dailyRate,
    travelerCount: trip.travelers.length,
    total,
    note: 'Phase 1 placeholder. Replace with GSA lookup + approval workflow in Phase 3.',
  });
}
