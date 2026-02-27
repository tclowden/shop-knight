import { NextResponse } from 'next/server';
import { TemplateAssigneeMode } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const templates = await prisma.taskTemplate.findMany({
    where: { active: true },
    include: { steps: { include: { specificAssignee: { select: { id: true, name: true } } }, orderBy: { sortOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const name = String(body?.name || '').trim();
  const steps = Array.isArray(body?.steps) ? body.steps : [];
  if (!name || steps.length === 0) {
    return NextResponse.json({ error: 'name and steps required' }, { status: 400 });
  }

  const created = await prisma.taskTemplate.create({
    data: {
      name,
      steps: {
        create: steps.map((s: Record<string, unknown>, idx: number) => ({
          title: String(s.title || `Step ${idx + 1}`),
          sortOrder: Number(s.sortOrder ?? idx + 1),
          dueOffsetDays: Number(s.dueOffsetDays ?? 0),
          assigneeMode: (s.assigneeMode as TemplateAssigneeMode) || 'UNASSIGNED',
          specificAssigneeId: s.specificAssigneeId ? String(s.specificAssigneeId) : null,
        })),
      },
    },
    include: { steps: { include: { specificAssignee: { select: { id: true, name: true } } }, orderBy: { sortOrder: 'asc' } } },
  });

  return NextResponse.json(created, { status: 201 });
}
