import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

function toDate(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const items = await prisma.trip.findMany({
    where: withCompany(companyId),
    include: {
      travelers: { include: { traveler: true } },
      segments: true,
    },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const userId = (auth.session.user as { id?: string } | undefined)?.id || null;
  const body = await req.json();

  const name = String(body?.name || '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const travelerIds = Array.isArray(body?.travelerIds) ? body.travelerIds.map(String).filter(Boolean) : [];

  const created = await prisma.trip.create({
    data: {
      companyId,
      name,
      projectRef: body?.projectRef ? String(body.projectRef) : null,
      destinations: body?.destinations ? String(body.destinations) : null,
      purpose: body?.purpose ? String(body.purpose) : null,
      startDate: toDate(body?.startDate),
      endDate: toDate(body?.endDate),
      status: body?.status || 'PLANNING',
      billable: Boolean(body?.billable),
      salesOrderRef: body?.salesOrderRef ? String(body.salesOrderRef) : null,
      createdByUserId: userId,
      travelers: travelerIds.length > 0 ? { create: travelerIds.map((travelerId: string) => ({ travelerId })) } : undefined,
    },
    include: { travelers: { include: { traveler: true } }, segments: true },
  });

  return NextResponse.json(created, { status: 201 });
}
