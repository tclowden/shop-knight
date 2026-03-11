import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles } from '@/lib/api-auth';

function toDate(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const salesOrder = await prisma.salesOrder.findFirst({ where: { id, companyId } });
  if (!salesOrder) return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });

  const userId = (auth.session.user as { id?: string } | undefined)?.id || null;
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const travelerIds = Array.isArray(body?.travelerIds) ? body.travelerIds.map(String).filter(Boolean) : [];

  const created = await prisma.trip.create({
    data: {
      companyId,
      name,
      destinations: body?.destinations ? String(body.destinations) : null,
      purpose: body?.purpose ? String(body.purpose) : null,
      startDate: toDate(body?.startDate),
      endDate: toDate(body?.endDate),
      status: body?.status || 'PLANNING',
      billable: body?.billable === undefined ? true : Boolean(body.billable),
      salesOrderRef: salesOrder.orderNumber,
      createdByUserId: userId,
      travelers: travelerIds.length > 0 ? { create: travelerIds.map((travelerId: string) => ({ travelerId })) } : undefined,
    },
    include: { travelers: { include: { traveler: true } }, segments: true },
  });

  return NextResponse.json(created, { status: 201 });
}
