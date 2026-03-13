import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

function assigneeForMode(step: { assigneeMode: string; specificAssigneeId: string | null }, pmUserId: string | null, projectCoordinatorUserId: string | null) {
  if (step.assigneeMode === 'SPECIFIC_USER') return step.specificAssigneeId || null;
  if (step.assigneeMode === 'PM') return pmUserId;
  if (step.assigneeMode === 'PROJECT_COORDINATOR') return projectCoordinatorUserId;
  return null;
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const line = await prisma.salesOrderLine.findFirst({
    where: { id, salesOrder: withCompany(companyId) },
    select: { id: true },
  });
  if (!line) return NextResponse.json({ error: 'Sales order line not found' }, { status: 404 });

  const job = await prisma.job.findFirst({
    where: { companyId, salesOrderLineId: id },
    orderBy: { createdAt: 'desc' },
  });

  if (!job) return NextResponse.json({ hasJob: false, workflowStatus: null });

  const latestRun = await prisma.jobWorkflowRun.findFirst({
    where: { companyId, entityType: 'JOB', entityId: job.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true },
  });

  return NextResponse.json({
    hasJob: true,
    jobId: job.id,
    workflowStatus: latestRun?.status ?? null,
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;

  const line = await prisma.salesOrderLine.findFirst({
    where: { id, salesOrder: withCompany(companyId) },
    include: { salesOrder: true },
  });
  if (!line) return NextResponse.json({ error: 'Sales order line not found' }, { status: 404 });

  const latestProof = await prisma.proof.findFirst({
    where: { salesOrderLineId: id },
    orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
  });

  if (!latestProof || latestProof.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Latest proof must be approved before creating a job.' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const workflowTemplateId = body?.workflowTemplateId ? String(body.workflowTemplateId) : '';
  const projectCoordinatorUserId = body?.projectCoordinatorUserId ? String(body.projectCoordinatorUserId) : null;

  const created = await prisma.$transaction(async (tx) => {
    const job = await tx.job.create({
      data: {
        companyId,
        name: `Job: ${line.description}`,
        opportunityId: line.salesOrder.opportunityId,
        salesOrderId: line.salesOrderId,
        salesOrderLineId: line.id,
      },
    });

    if (workflowTemplateId) {
      const template = await tx.jobWorkflowTemplate.findFirst({
        where: withCompany(companyId, { id: workflowTemplateId, active: true }),
        include: { steps: { orderBy: { sortOrder: 'asc' } } },
      });

      if (!template) {
        throw new Error('Selected workflow template not found');
      }

      if (template.steps.length > 0) {
        const run = await tx.jobWorkflowRun.create({
          data: {
            companyId,
            workflowTemplateId: template.id,
            entityType: 'JOB',
            entityId: job.id,
            status: 'IN_PROGRESS',
            currentStepSortOrder: template.steps[0].sortOrder,
            projectManagerUserId: line.salesOrder.projectManagerId,
            projectCoordinatorUserId,
            steps: {
              create: template.steps.map((step, idx) => ({
                stepName: step.name,
                sortOrder: step.sortOrder,
                assigneeMode: step.assigneeMode,
                assigneeId: assigneeForMode(step, line.salesOrder.projectManagerId, projectCoordinatorUserId),
                status: idx === 0 ? 'IN_PROGRESS' : 'TODO',
                activatedAt: idx === 0 ? new Date() : null,
              })),
            },
          },
          include: { steps: { orderBy: { sortOrder: 'asc' } } },
        });

        const firstStep = run.steps[0];
        if (firstStep) {
          await tx.task.create({
            data: {
              title: `[Workflow] ${firstStep.stepName}`,
              status: 'TODO',
              assigneeId: firstStep.assigneeId,
              entityType: 'JOB',
              entityId: job.id,
            },
          });
        }
      }
    }

    return job;
  });

  return NextResponse.json(created, { status: 201 });
}
