import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

function toDate(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });
  const { id } = await params;

  const item = await prisma.trip.findFirst({
    where: withCompany(companyId, { id }),
    include: { travelers: { include: { traveler: true } }, segments: true },
  });
  if (!item) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  return NextResponse.json(item);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });
  const { id } = await params;

  const existing = await prisma.trip.findFirst({ where: withCompany(companyId, { id }), select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const body = await req.json();
  const travelerIds = Array.isArray(body?.travelerIds) ? body.travelerIds.map(String).filter(Boolean) : null;

  const updated = await prisma.trip.update({
    where: { id },
    data: {
      name: body?.name !== undefined ? String(body.name || '') : undefined,
      projectRef: body?.projectRef !== undefined ? (body.projectRef ? String(body.projectRef) : null) : undefined,
      destinations: body?.destinations !== undefined ? (body.destinations ? String(body.destinations) : null) : undefined,
      destinationCity: body?.destinationCity !== undefined ? (body.destinationCity ? String(body.destinationCity) : null) : undefined,
      destinationState: body?.destinationState !== undefined ? (body.destinationState ? String(body.destinationState).toUpperCase() : null) : undefined,
      purpose: body?.purpose !== undefined ? (body.purpose ? String(body.purpose) : null) : undefined,
      startDate: body?.startDate !== undefined ? toDate(body.startDate) : undefined,
      endDate: body?.endDate !== undefined ? toDate(body.endDate) : undefined,
      status: body?.status !== undefined ? body.status : undefined,
      billable: body?.billable !== undefined ? Boolean(body.billable) : undefined,
      salesOrderRef: body?.salesOrderRef !== undefined ? (body.salesOrderRef ? String(body.salesOrderRef) : null) : undefined,
      travelers: travelerIds
        ? {
            deleteMany: {},
            create: travelerIds.map((travelerId: string) => ({ travelerId })),
          }
        : undefined,
    },
    include: { travelers: { include: { traveler: true } }, segments: true },
  });

  return NextResponse.json(updated);
}
