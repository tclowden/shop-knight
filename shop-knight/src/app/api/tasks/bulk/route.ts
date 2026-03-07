import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

function toDate(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function PATCH(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const taskIds = Array.isArray(body?.taskIds) ? body.taskIds.map(String).filter(Boolean) : [];
  if (taskIds.length === 0) return NextResponse.json({ error: 'taskIds required' }, { status: 400 });

  const data: {
    status?: string;
    assigneeId?: string | null;
    dueAt?: Date | null;
  } = {};

  if (body?.status !== undefined) data.status = String(body.status);
  if (body?.assigneeId !== undefined) data.assigneeId = body.assigneeId ? String(body.assigneeId) : null;
  if (body?.dueAt !== undefined) data.dueAt = toDate(body.dueAt);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No update fields provided' }, { status: 400 });
  }

  await prisma.task.updateMany({
    where: { id: { in: taskIds } },
    data,
  });

  const updated = await prisma.task.findMany({
    where: { id: { in: taskIds } },
    include: { assignee: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ updatedCount: updated.length, tasks: updated });
}
