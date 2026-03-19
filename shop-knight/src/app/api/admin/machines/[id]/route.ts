import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;

  const existing = await prisma.machine.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Machine not found' }, { status: 404 });

  const updated = await prisma.machine.update({ where: { id }, data: { active: false } });
  return NextResponse.json(updated);
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  if (body?.action !== 'restore') {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.machine.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Machine not found' }, { status: 404 });

  const updated = await prisma.machine.update({ where: { id }, data: { active: true } });
  return NextResponse.json(updated);
}
