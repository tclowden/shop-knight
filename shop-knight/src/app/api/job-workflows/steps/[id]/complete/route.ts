import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;

  const step = await prisma.jobWorkflowStepRun.findFirst({
    where: { id, workflowRun: withCompany(companyId) },
    include: { workflowRun: true },
  });

  if (!step) return NextResponse.json({ error: 'Workflow step not found' }, { status: 404 });
  if (step.status === 'DONE') return NextResponse.json({ ok: true, alreadyDone: true });

  const updated = await prisma.$transaction(async (tx) => {
    const done = await tx.jobWorkflowStepRun.update({
      where: { id: step.id },
      data: { status: 'DONE', completedAt: new Date() },
    });

    const next = await tx.jobWorkflowStepRun.findFirst({
      where: { workflowRunId: step.workflowRunId, sortOrder: { gt: step.sortOrder } },
      orderBy: { sortOrder: 'asc' },
    });

    if (next) {
      await tx.jobWorkflowStepRun.update({
        where: { id: next.id },
        data: { status: 'IN_PROGRESS', activatedAt: next.activatedAt || new Date() },
      });
      await tx.jobWorkflowRun.update({ where: { id: step.workflowRunId }, data: { currentStepSortOrder: next.sortOrder, status: 'IN_PROGRESS' } });
    } else {
      await tx.jobWorkflowRun.update({ where: { id: step.workflowRunId }, data: { status: 'DONE', currentStepSortOrder: null } });
    }

    return done;
  });

  return NextResponse.json(updated);
}
