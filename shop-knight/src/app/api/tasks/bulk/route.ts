import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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

  const data: Prisma.TaskUpdateInput = {};

  if (body?.status !== undefined) data.status = String(body.status) as never;
  if (body?.assigneeId !== undefined) {
    data.assignee = body.assigneeId
      ? { connect: { id: String(body.assigneeId) } }
      : { disconnect: true };
  }
  if (body?.startAt !== undefined) data.startAt = toDate(body.startAt);
  if (body?.dueAt !== undefined) data.dueAt = toDate(body.dueAt);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No update fields provided' }, { status: 400 });
  }

  await Promise.all(
    taskIds.map((id: string) =>
      prisma.task.update({
        where: { id },
        data,
      })
    )
  );

  const updated = await prisma.task.findMany({
    where: { id: { in: taskIds } },
    include: { assignee: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ updatedCount: updated.length, tasks: updated });
}
