import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const tasks = await prisma.task.findMany({
    where: { status: { not: 'DONE' } },
    include: { assignee: { select: { id: true, name: true } } },
    orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(tasks);
}
