import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

function plusDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();

  const entityType = String(body?.entityType || '');
  const entityId = String(body?.entityId || '');
  const anchorDate = body?.anchorDate ? new Date(String(body.anchorDate)) : new Date();
  const pmUserId = body?.pmUserId ? String(body.pmUserId) : null;
  const projectCoordinatorUserId = body?.projectCoordinatorUserId ? String(body.projectCoordinatorUserId) : null;

  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'entityType and entityId required' }, { status: 400 });
  }

  const template = await prisma.taskTemplate.findUnique({ where: { id }, include: { steps: { orderBy: { sortOrder: 'asc' } } } });
  if (!template) return NextResponse.json({ error: 'template not found' }, { status: 404 });

  const created = await prisma.$transaction(
    template.steps.map((step) => {
      let assigneeId: string | null = null;
      if (step.assigneeMode === 'SPECIFIC_USER') assigneeId = step.specificAssigneeId || null;
      if (step.assigneeMode === 'PM') assigneeId = pmUserId;
      if (step.assigneeMode === 'PROJECT_COORDINATOR') assigneeId = projectCoordinatorUserId;

      return prisma.task.create({
        data: {
          title: step.title,
          entityType: entityType as never,
          entityId,
          status: 'TODO' as never,
          assigneeId,
          dueAt: plusDays(anchorDate, step.dueOffsetDays),
        },
      });
    })
  );

  return NextResponse.json({ createdCount: created.length });
}
