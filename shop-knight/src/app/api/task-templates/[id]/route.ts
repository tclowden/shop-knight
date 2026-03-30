import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions, withCompany } from '@/lib/api-auth';

const ASSIGNEE_MODES = ['UNASSIGNED', 'SPECIFIC_USER', 'PM', 'PROJECT_COORDINATOR'] as const;

const stepSchema = z.object({
  title: z.string().trim().min(1, 'Step title is required'),
  sortOrder: z.coerce.number().int().min(1),
  dueOffsetDays: z.coerce.number().int(),
  assigneeMode: z.enum(ASSIGNEE_MODES),
  specificAssigneeId: z.string().trim().min(1).nullable().optional(),
});

const taskTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Template name is required'),
  steps: z.array(stepSchema).min(1, 'At least one step is required'),
});

async function validateSpecificAssignees(companyId: string | null, steps: Array<z.infer<typeof stepSchema>>) {
  const specificUserIds = Array.from(
    new Set(
      steps
        .filter((step) => step.assigneeMode === 'SPECIFIC_USER')
        .map((step) => step.specificAssigneeId)
        .filter((id): id is string => Boolean(id))
    )
  );

  const missingSpecificAssignee = steps.find((step) => step.assigneeMode === 'SPECIFIC_USER' && !step.specificAssigneeId);
  if (missingSpecificAssignee) {
    return 'Specific user steps require a selected user';
  }

  if (specificUserIds.length === 0) return null;

  const users = await prisma.user.findMany({
    where: {
      id: { in: specificUserIds },
      active: true,
      ...(companyId
        ? { companyMemberships: { some: withCompany(companyId) } }
        : {}),
    },
    select: { id: true },
  });

  if (users.length !== specificUserIds.length) {
    return 'One or more specific assignees are invalid for the active company';
  }

  return null;
}

function mapTemplateSteps(steps: Array<z.infer<typeof stepSchema>>) {
  return steps.map((step, idx) => ({
    title: step.title,
    sortOrder: idx + 1,
    dueOffsetDays: step.dueOffsetDays,
    assigneeMode: step.assigneeMode,
    specificAssigneeId: step.assigneeMode === 'SPECIFIC_USER' ? step.specificAssigneeId ?? null : null,
  }));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissions(['tasks.templates.view']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  const { id } = await params;

  const existing = await prisma.taskTemplate.findFirst({
    where: companyId ? withCompany(companyId, { id, active: true }) : { id, companyId: null, active: true },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Task template not found' }, { status: 404 });

  const parsed = taskTemplateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid task template payload', detail: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 });
  }

  const assigneeError = await validateSpecificAssignees(companyId, parsed.data.steps);
  if (assigneeError) {
    return NextResponse.json({ error: 'Invalid task template payload', detail: assigneeError }, { status: 400 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.taskTemplateStep.deleteMany({ where: { templateId: id } });

      return tx.taskTemplate.update({
        where: { id },
        data: {
          name: parsed.data.name,
          steps: {
            create: mapTemplateSteps(parsed.data.steps),
          },
        },
        include: { steps: { include: { specificAssignee: { select: { id: true, name: true } } }, orderBy: { sortOrder: 'asc' } } },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Task template name already exists' }, { status: 409 });
    }
    throw error;
  }
}
