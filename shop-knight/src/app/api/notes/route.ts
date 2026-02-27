import { NextResponse } from 'next/server';
import { EntityType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

const TYPES: EntityType[] = ['OPPORTUNITY', 'QUOTE', 'SALES_ORDER', 'SALES_ORDER_LINE', 'PURCHASE_ORDER', 'PROJECT', 'JOB', 'CUSTOMER', 'VENDOR', 'PRODUCT', 'USER'];

export async function GET(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entityType') as EntityType | null;
  const entityId = searchParams.get('entityId');
  if (!entityType || !entityId || !TYPES.includes(entityType)) {
    return NextResponse.json({ error: 'entityType and entityId required' }, { status: 400 });
  }

  const notes = await prisma.note.findMany({
    where: { entityType, entityId },
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const entityType = body?.entityType as EntityType;
  const entityId = String(body?.entityId || '').trim();
  const text = String(body?.body || '').trim();
  if (!entityType || !entityId || !text || !TYPES.includes(entityType)) {
    return NextResponse.json({ error: 'entityType, entityId, body required' }, { status: 400 });
  }

  const note = await prisma.note.create({
    data: { entityType, entityId, body: text },
    include: { createdBy: { select: { id: true, name: true } } },
  });
  return NextResponse.json(note, { status: 201 });
}
