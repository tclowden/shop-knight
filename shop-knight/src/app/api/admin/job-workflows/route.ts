import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const items = await prisma.jobWorkflowTemplate.findMany({
    where: withCompany(companyId),
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
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || '').trim();
  const steps = Array.isArray(body?.steps) ? body.steps : [];

  if (!name || steps.length === 0) {
    return NextResponse.json({ error: 'name and steps are required' }, { status: 400 });
  }

  try {
    const created = await prisma.jobWorkflowTemplate.create({
      data: {
        companyId,
        name,
        active: body?.active === undefined ? true : Boolean(body.active),
        steps: {
          create: steps.map((s: Record<string, unknown>, idx: number) => ({
            name: String(s.name || `Step ${idx + 1}`),
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
  } catch {
    return NextResponse.json({ error: 'Workflow already exists or could not be created' }, { status: 409 });
  }
}
