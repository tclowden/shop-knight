import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function GET(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const activeStatuses = ['PRE_TRAVEL', 'IN_TRANSIT', 'ON_SITE'];

  const trips = await prisma.trip.findMany({
    where: withCompany(companyId, {
      status: status ? (status as never) : { in: activeStatuses as never },
    }),
    include: {
      travelers: { include: { traveler: { select: { id: true, fullName: true } } } },
      segments: { orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }] },
    },
    orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
  });

  const data = trips.map((trip) => {
    const latestSegment = trip.segments[0] || null;
    return {
      id: trip.id,
      name: trip.name,
      status: trip.status,
      destinations: trip.destinations,
      destinationCity: trip.destinationCity,
      destinationState: trip.destinationState,
      salesOrderRef: trip.salesOrderRef,
      startDate: trip.startDate,
      endDate: trip.endDate,
      travelers: trip.travelers.map((t) => t.traveler.fullName),
      map: {
        label: latestSegment?.destination || (trip.destinationCity && trip.destinationState ? `${trip.destinationCity}, ${trip.destinationState}` : (trip.destinations || null)),
        segmentType: latestSegment?.segmentType || null,
        provider: latestSegment?.provider || null,
        startAt: latestSegment?.startAt || null,
      },
    };
  });

  return NextResponse.json(data);
}
