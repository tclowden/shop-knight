import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireRoles(['SALES_REP', 'PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id: productId } = await ctx.params;
  const rows = await prisma.productInventoryRequirement.findMany({
    where: withCompany(companyId, { productId }),
    include: { inventoryItem: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(rows);
}
