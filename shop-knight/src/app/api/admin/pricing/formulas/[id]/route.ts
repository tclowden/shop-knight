import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

const schema = z.object({
  name: z.string().trim().min(1),
  formula: z.string().trim().min(1),
  uom: z.string().trim().min(1),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.pricingFormula.findFirst({ where: withCompany(companyId, { id, active: true }) });
  if (!existing) return NextResponse.json({ error: 'Pricing formula not found' }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid pricing formula payload' }, { status: 400 });

  try {
    const updated = await prisma.pricingFormula.update({ where: { id }, data: parsed.data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Pricing formula already exists or could not be updated' }, { status: 409 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.pricingFormula.findFirst({ where: withCompany(companyId, { id, active: true }) });
  if (!existing) return NextResponse.json({ error: 'Pricing formula not found' }, { status: 404 });

  await prisma.pricingFormula.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
