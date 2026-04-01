import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

const schema = z.object({ name: z.string().trim().min(1) });
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.pricingDiscount.findFirst({ where: withCompany(companyId, { id, active: true }) });
  if (!existing) return NextResponse.json({ error: 'Discount not found' }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid discount payload' }, { status: 400 });

  const updated = await prisma.pricingDiscount.update({ where: { id }, data: { name: parsed.data.name } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.pricingDiscount.findFirst({ where: withCompany(companyId, { id, active: true }) });
  if (!existing) return NextResponse.json({ error: 'Discount not found' }, { status: 404 });

  await prisma.pricingDiscount.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
