import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

function toDate(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.task.update({
    where: { id },
    data: {
      title: body?.title !== undefined ? String(body.title) : undefined,
      status: body?.status !== undefined ? (String(body.status) as never) : undefined,
      assigneeId: body?.assigneeId !== undefined ? (body.assigneeId ? String(body.assigneeId) : null) : undefined,
      dueAt: body?.dueAt !== undefined ? toDate(body.dueAt) : undefined,
    },
    include: { assignee: { select: { id: true, name: true } } },
  });

  return NextResponse.json(updated);
}
