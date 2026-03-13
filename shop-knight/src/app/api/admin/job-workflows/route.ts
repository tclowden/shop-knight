import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions, withCompany } from '@/lib/api-auth';

export async function GET() {
  const auth = await requirePermissions(['admin.users.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);

  const items = await prisma.jobWorkflowTemplate.findMany({
    where: companyId ? withCompany(companyId) : { companyId: null },
    include: {
      steps: {
        orderBy: { sortOrder: 'asc' },
        include: { specificAssignee: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const auth = await requirePermissions(['admin.users.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || '').trim();
  const steps = Array.isArray(body?.steps) ? body.steps : [];

  if (!name || steps.length === 0) {
    return NextResponse.json({ error: 'name and steps are required' }, { status: 400 });
  }

  try {
    const created = await prisma.jobWorkflowTemplate.create({
      data: {
        companyId: companyId ?? null,
        name,
        active: body?.active === undefined ? true : Boolean(body.active),
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

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: `A workflow named "${name}" already exists. Please use a different name.` }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Failed to create workflow', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
