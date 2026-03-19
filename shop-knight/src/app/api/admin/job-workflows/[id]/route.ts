import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requirePermissions(['admin.users.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  const { id } = await ctx.params;

  const existing = await prisma.jobWorkflowTemplate.findFirst({
    where: companyId ? withCompany(companyId, { id }) : { id, companyId: null },
  });
  if (!existing) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || '').trim();
  const steps = Array.isArray(body?.steps) ? body.steps : [];

  if (!name || steps.length === 0) {
    return NextResponse.json({ error: 'name and steps are required' }, { status: 400 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.jobWorkflowStep.deleteMany({ where: { workflowId: id } });

      return tx.jobWorkflowTemplate.update({
        where: { id },
        data: {
          name,
          steps: {
            create: steps.map((s: Record<string, unknown>, idx: number) => ({
              name: String(s.name || `Step ${idx + 1}`).trim(),
              sortOrder: Number(s.sortOrder ?? idx + 1),
              assigneeMode: (String(s.assigneeMode || 'UNASSIGNED') as 'UNASSIGNED' | 'SPECIFIC_USER' | 'PM' | 'PROJECT_COORDINATOR'),
              specificAssigneeId: s.specificAssigneeId ? String(s.specificAssigneeId) : null,
            })),
          },
        },
        include: {
          steps: {
            orderBy: { sortOrder: 'asc' },
            include: { specificAssignee: { select: { id: true, name: true } } },
          },
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: `A workflow named "${name}" already exists. Please use a different name.` }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update workflow', detail: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
