import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

function toDate(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const trip = await prisma.trip.findFirst({ where: withCompany(companyId, { id }), select: { id: true } });
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const segments = await prisma.tripSegment.findMany({
    where: { tripId: id },
    include: { traveler: { select: { id: true, fullName: true } } },
    orderBy: [{ startAt: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json(segments);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const trip = await prisma.trip.findFirst({ where: withCompany(companyId, { id }), select: { id: true } });
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const body = await req.json();
  const segmentType = String(body?.segmentType || '').trim();
  if (!segmentType) return NextResponse.json({ error: 'segmentType required' }, { status: 400 });

  const travelerId = body?.travelerId ? String(body.travelerId) : null;
  if (travelerId) {
    const traveler = await prisma.traveler.findFirst({ where: withCompany(companyId, { id: travelerId }) });
    if (!traveler) return NextResponse.json({ error: 'Traveler not found' }, { status: 404 });
  }

  const created = await prisma.tripSegment.create({
    data: {
      tripId: id,
      travelerId,
      segmentType: segmentType as never,
      provider: body?.provider ? String(body.provider) : null,
      confirmationCode: body?.confirmationCode ? String(body.confirmationCode) : null,
      startAt: toDate(body?.startAt),
      endAt: toDate(body?.endAt),
      origin: body?.origin ? String(body.origin) : null,
      destination: body?.destination ? String(body.destination) : null,
      address: body?.address ? String(body.address) : null,
      notes: body?.notes ? String(body.notes) : null,
      estimatedCost: toNumber(body?.estimatedCost),
    },
    include: { traveler: { select: { id: true, fullName: true } } },
  });

  return NextResponse.json(created, { status: 201 });
}
