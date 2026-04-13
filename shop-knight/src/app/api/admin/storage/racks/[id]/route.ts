import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const row = await prisma.storageRack.findFirst({ where: withCompany(companyId, { id }) });
  if (!row) return NextResponse.json({ error: 'Rack not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.storageRack.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Rack not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? existing.name).trim();
  const code = body?.code === '' ? null : body?.code !== undefined ? String(body.code).trim() : existing.code;

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const updated = await prisma.storageRack.update({ where: { id }, data: { name, code } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.storageRack.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Rack not found' }, { status: 404 });
  const updated = await prisma.storageRack.update({ where: { id }, data: { active: false } });
  return NextResponse.json(updated);
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { id } = await ctx.params;
  if (body?.action !== 'restore') return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });

  const existing = await prisma.storageRack.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Rack not found' }, { status: 404 });
  const updated = await prisma.storageRack.update({ where: { id }, data: { active: true } });
  return NextResponse.json(updated);
}
