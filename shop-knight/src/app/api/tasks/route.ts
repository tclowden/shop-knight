import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getSessionCompanyId } from '@/lib/api-auth';
import { sendTaskAssignedEmail, shouldSendEmailNotification } from '@/lib/notifications';

const TYPES = ['OPPORTUNITY', 'QUOTE', 'SALES_ORDER', 'SALES_ORDER_LINE', 'PURCHASE_ORDER', 'PROJECT', 'JOB', 'CUSTOMER', 'VENDOR', 'PRODUCT', 'USER'] as const;
type EntityTypeValue = (typeof TYPES)[number];

function toDate(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entityType') as EntityTypeValue | null;
  const entityId = searchParams.get('entityId');
  if (!entityType || !entityId || !TYPES.includes(entityType)) {
    return NextResponse.json({ error: 'entityType and entityId required' }, { status: 400 });
  }

  const tasks = await prisma.task.findMany({
    where: { entityType, entityId },
    include: { assignee: { select: { id: true, name: true } } },
    orderBy: [{ status: 'asc' }, { startAt: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const title = String(body?.title || '').trim();
  const entityType = body?.entityType as EntityTypeValue;
  const entityId = String(body?.entityId || '').trim();
  if (!title || !entityType || !entityId || !TYPES.includes(entityType)) {
    return NextResponse.json({ error: 'title, entityType, entityId required' }, { status: 400 });
  }

  const companyId = getSessionCompanyId(session as { user?: { companyId?: string } });

  const task = await prisma.task.create({
    data: {
      title,
      entityType,
      entityId,
      status: (String(body?.status || 'TODO') as never),
      assigneeId: body?.assigneeId ? String(body.assigneeId) : null,
      startAt: toDate(body?.startAt),
      dueAt: toDate(body?.dueAt),
    },
    include: { assignee: { select: { id: true, name: true, email: true } } },
  });

  if (task.assigneeId && task.assignee?.email) {
    const canEmail = await shouldSendEmailNotification({
      companyId: companyId ?? null,
      userId: task.assigneeId,
      event: 'TASK_ASSIGNED',
    });

    if (canEmail) {
      try {
        await sendTaskAssignedEmail({
          to: task.assignee.email,
          assigneeName: task.assignee.name,
          taskTitle: task.title,
          taskId: task.id,
        });
      } catch {
        // do not fail task creation on email send issues
      }
    }
  }

  return NextResponse.json(task, { status: 201 });
}
