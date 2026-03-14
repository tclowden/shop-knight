import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles } from '@/lib/api-auth';
import { sendTaskAssignedEmail, shouldSendEmailNotification } from '@/lib/notifications';

function toDate(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'SALES_REP', 'OPERATIONS', 'PURCHASING', 'PROJECT_MANAGER', 'DESIGNER', 'FINANCE']);
  if (!auth.ok) return auth.response;

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
      dueAt: body?.dueAt !== undefined ? toDate(body.dueAt) : undefined,
    },
    include: { assignee: { select: { id: true, name: true, email: true } } },
  });

  if (updated.assigneeId && updated.assigneeId !== before.assigneeId && updated.assignee?.email) {
    const companyId = getSessionCompanyId(auth.session);
    const canEmail = await shouldSendEmailNotification({
      companyId: companyId ?? null,
      userId: updated.assigneeId,
      event: 'TASK_ASSIGNED',
    });

    if (canEmail) {
      try {
        await sendTaskAssignedEmail({
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
