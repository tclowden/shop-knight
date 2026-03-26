import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string; requirementId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id: productId, requirementId } = await ctx.params;
  const existing = await prisma.productInventoryRequirement.findFirst({ where: withCompany(companyId, { id: requirementId, productId }) });
  if (!existing) return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });

  await prisma.productInventoryRequirement.delete({ where: { id: requirementId } });
  return NextResponse.json({ ok: true });
}
