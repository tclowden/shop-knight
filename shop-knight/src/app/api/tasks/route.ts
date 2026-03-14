import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermissions } from '@/lib/api-auth';

const TYPES = ['OPPORTUNITY', 'QUOTE', 'SALES_ORDER', 'SALES_ORDER_LINE', 'PURCHASE_ORDER', 'PROJECT', 'JOB', 'CUSTOMER', 'VENDOR', 'PRODUCT', 'USER'] as const;
type EntityTypeValue = (typeof TYPES)[number];

function toDate(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) {
  const auth = await requirePermissions(['tasks.calendar.view']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entityType') as EntityTypeValue | null;
  const entityId = searchParams.get('entityId');
  if (!entityType || !entityId || !TYPES.includes(entityType)) {
    return NextResponse.json({ error: 'entityType and entityId required' }, { status: 400 });
  }

  const tasks = await prisma.task.findMany({
    where: { entityType, entityId },
    include: { assignee: { select: { id: true, name: true } } },
    orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const auth = await requirePermissions(['tasks.calendar.view']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const title = String(body?.title || '').trim();
  const entityType = body?.entityType as EntityTypeValue;
  const entityId = String(body?.entityId || '').trim();
  if (!title || !entityType || !entityId || !TYPES.includes(entityType)) {
    return NextResponse.json({ error: 'title, entityType, entityId required' }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title,
      entityType,
      entityId,
      status: (String(body?.status || 'TODO') as never),
      assigneeId: body?.assigneeId ? String(body.assigneeId) : null,
      dueAt: toDate(body?.dueAt),
    },
    include: { assignee: { select: { id: true, name: true } } },
  });
  return NextResponse.json(task, { status: 201 });
}
