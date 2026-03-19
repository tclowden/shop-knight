import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER', 'FINANCE', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const jobs = await prisma.job.findMany({
    where: withCompany(companyId),
    include: {
      salesOrder: { select: { id: true, orderNumber: true, title: true } },
      salesOrderLine: { select: { id: true, description: true } },
      opportunity: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const withWorkflow = await Promise.all(
    jobs.map(async (job) => {
      const run = await prisma.jobWorkflowRun.findFirst({
        where: withCompany(companyId, { entityType: 'JOB' as const, entityId: job.id }),
        include: {
          workflowTemplate: { select: { id: true, name: true } },
          steps: { select: { id: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        ...job,
        workflow: run
          ? {
              id: run.id,
              status: run.status,
              templateName: run.workflowTemplate.name,
              totalSteps: run.steps.length,
              completedSteps: run.steps.filter((s) => s.status === 'DONE').length,
            }
          : null,
      };
    })
  );

  return NextResponse.json(withWorkflow);
}
