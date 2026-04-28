import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getSessionCompanyId } from '@/lib/api-auth';
import { sendTaskAssignedEmail, shouldSendEmailNotification } from '@/lib/notifications';

function toDate(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const before = await prisma.task.findUnique({
    where: { id },
    select: { id: true, title: true, assigneeId: true },
  });
  if (!before) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const updated = await prisma.task.update({
    where: { id },
    data: {
      title: body?.title !== undefined ? String(body.title) : undefined,
      status: body?.status !== undefined ? (String(body.status) as never) : undefined,
      assigneeId: body?.assigneeId !== undefined ? (body.assigneeId ? String(body.assigneeId) : null) : undefined,
      startAt: body?.startAt !== undefined ? toDate(body.startAt) : undefined,
      dueAt: body?.dueAt !== undefined ? toDate(body.dueAt) : undefined,
    },
    include: { assignee: { select: { id: true, name: true, email: true } } },
  });

  if (updated.assigneeId && updated.assigneeId !== before.assigneeId && updated.assignee?.email) {
    const companyId = getSessionCompanyId(session as { user?: { companyId?: string } });
    const canEmail = await shouldSendEmailNotification({
      companyId: companyId ?? null,
      userId: updated.assigneeId,
      event: 'TASK_ASSIGNED',
    });

    if (canEmail) {
      try {
        await sendTaskAssignedEmail({
          companyId,
          to: updated.assignee.email,
          assigneeName: updated.assignee.name,
          taskTitle: updated.title,
          taskId: updated.id,
        });
      } catch {
        // do not fail update on email send issues
      }
    }
  }

  return NextResponse.json(updated);
}
