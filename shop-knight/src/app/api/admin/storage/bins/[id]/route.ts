import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN', 'STORAGE']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });
  const { id } = await ctx.params;

  const row = await prisma.storageBin.findFirst({ where: withCompany(companyId, { id }), include: { space: { include: { rack: true } } } });
  if (!row) return NextResponse.json({ error: 'Bin not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN', 'STORAGE']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });
  const { id } = await ctx.params;

  const existing = await prisma.storageBin.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Bin not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const spaceId = body?.spaceId ? String(body.spaceId).trim() : existing.spaceId;
  const name = String(body?.name ?? existing.name).trim();
  const code = body?.code === '' ? null : body?.code !== undefined ? String(body.code).trim() : existing.code;

  if (!spaceId || !name) return NextResponse.json({ error: 'spaceId and name are required' }, { status: 400 });

  const space = await prisma.storageSpace.findFirst({ where: withCompany(companyId, { id: spaceId }) });
  if (!space) return NextResponse.json({ error: 'Space not found' }, { status: 404 });

  const updated = await prisma.storageBin.update({ where: { id }, data: { spaceId, name, code } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN', 'STORAGE']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });
  const { id } = await ctx.params;

  const existing = await prisma.storageBin.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Bin not found' }, { status: 404 });
  const updated = await prisma.storageBin.update({ where: { id }, data: { active: false } });
  return NextResponse.json(updated);
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN', 'STORAGE']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const { id } = await ctx.params;
  if (body?.action !== 'restore') return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });

  const existing = await prisma.storageBin.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Bin not found' }, { status: 404 });
  const updated = await prisma.storageBin.update({ where: { id }, data: { active: true } });
  return NextResponse.json(updated);
}
