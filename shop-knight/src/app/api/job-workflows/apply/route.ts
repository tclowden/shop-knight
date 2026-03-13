import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

function assigneeForMode(step: { assigneeMode: string; specificAssigneeId: string | null }, pmUserId: string | null, projectCoordinatorUserId: string | null) {
  if (step.assigneeMode === 'SPECIFIC_USER') return step.specificAssigneeId || null;
  if (step.assigneeMode === 'PM') return pmUserId;
  if (step.assigneeMode === 'PROJECT_COORDINATOR') return projectCoordinatorUserId;
  return null;
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const workflowTemplateId = String(body?.workflowTemplateId || '').trim();
  const entityType = String(body?.entityType || '').trim();
  const entityId = String(body?.entityId || '').trim();
  const pmUserId = body?.pmUserId ? String(body.pmUserId) : null;
  const projectCoordinatorUserId = body?.projectCoordinatorUserId ? String(body.projectCoordinatorUserId) : null;

  if (!workflowTemplateId || !entityType || !entityId) {
    return NextResponse.json({ error: 'workflowTemplateId, entityType, and entityId are required' }, { status: 400 });
  }

  const template = await prisma.jobWorkflowTemplate.findFirst({
    where: withCompany(companyId, { id: workflowTemplateId, active: true }),
    include: { steps: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!template) return NextResponse.json({ error: 'Workflow template not found' }, { status: 404 });
  if (template.steps.length === 0) return NextResponse.json({ error: 'Workflow has no steps' }, { status: 400 });

  const run = await prisma.jobWorkflowRun.create({
    data: {
      companyId,
      workflowTemplateId: template.id,
      entityType: entityType as 'OPPORTUNITY' | 'QUOTE' | 'SALES_ORDER' | 'SALES_ORDER_LINE' | 'PURCHASE_ORDER' | 'PROJECT' | 'JOB' | 'CUSTOMER' | 'VENDOR' | 'PRODUCT' | 'USER',
      entityId,
      status: 'IN_PROGRESS',
      currentStepSortOrder: template.steps[0].sortOrder,
      projectManagerUserId: pmUserId,
      projectCoordinatorUserId,
      steps: {
        create: template.steps.map((step, idx) => ({
          stepName: step.name,
          sortOrder: step.sortOrder,
          assigneeMode: step.assigneeMode,
          assigneeId: assigneeForMode(step, pmUserId, projectCoordinatorUserId),
          status: idx === 0 ? 'IN_PROGRESS' : 'TODO',
          activatedAt: idx === 0 ? new Date() : null,
        })),
      },
    },
    include: { steps: { orderBy: { sortOrder: 'asc' } } },
  });

  return NextResponse.json(run, { status: 201 });
}
