import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

const HIGH_RISK_KEYWORDS = ['hurricane', 'flood', 'wildfire', 'riot', 'civil unrest', 'advisory'];

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const activeTrips = await prisma.trip.findMany({
    where: withCompany(companyId, { status: { in: ['PRE_TRAVEL', 'IN_TRANSIT', 'ON_SITE'] as never } }),
    include: {
      travelers: { include: { traveler: { select: { fullName: true } } } },
      segments: { orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }], take: 1 },
    },
    orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
  });

  const alerts = activeTrips
    .map((trip) => {
      const location = trip.segments[0]?.destination || trip.destinations || '';
      const lower = location.toLowerCase();
      const matched = HIGH_RISK_KEYWORDS.find((k) => lower.includes(k));
      if (!matched) return null;

      return {
        severity: 'HIGH',
        source: 'placeholder-rule-engine',
        travelerNames: trip.travelers.map((t) => t.traveler.fullName),
        tripId: trip.id,
        tripName: trip.name,
        location,
        reason: `Matched risk keyword: ${matched}`,
        recommendedAction: 'Review itinerary and contact traveler/manager to confirm safety plan.',
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    mode: 'placeholder',
    alerts,
    note: 'Phase 2 placeholder. Replace with live feeds (State Dept, weather, crime, GDELT) and scoring.',
  });
}
