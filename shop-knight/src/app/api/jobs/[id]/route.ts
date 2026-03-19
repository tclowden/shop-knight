import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER', 'FINANCE', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;

  const job = await prisma.job.findFirst({
    where: withCompany(companyId, { id }),
    include: {
      salesOrder: { select: { id: true, orderNumber: true, title: true } },
      salesOrderLine: { select: { id: true, description: true } },
      opportunity: { select: { id: true, name: true } },
    },
  });

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const run = await prisma.jobWorkflowRun.findFirst({
    where: withCompany(companyId, { entityType: 'JOB' as const, entityId: job.id }),
    include: {
      workflowTemplate: { select: { id: true, name: true } },
      steps: {
        include: { assignee: { select: { id: true, name: true } } },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ ...job, workflowRun: run || null });
}
