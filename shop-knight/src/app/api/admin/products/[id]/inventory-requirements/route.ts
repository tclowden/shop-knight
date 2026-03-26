import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
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

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id: productId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const inventoryItemId = String(body?.inventoryItemId || '');
  const qtyPerUnit = Number(body?.qtyPerUnit || 0);

  if (!inventoryItemId || !Number.isFinite(qtyPerUnit) || qtyPerUnit <= 0) {
    return NextResponse.json({ error: 'inventoryItemId and qtyPerUnit (>0) are required' }, { status: 400 });
  }

  try {
    const row = await prisma.productInventoryRequirement.create({
      data: { companyId, productId, inventoryItemId, qtyPerUnit: Math.floor(qtyPerUnit) },
      include: { inventoryItem: true },
    });
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Requirement already exists or could not be created' }, { status: 409 });
  }
}
