import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ itemId: string }> };

export async function POST(_: Request, ctx: Ctx) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'PURCHASING', 'OPERATIONS', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { itemId } = await ctx.params;

  const existing = await prisma.salesOrderPurchaseItem.findFirst({
    where: { id: itemId, salesOrder: withCompany(companyId) },
    select: {
      id: true,
      salesOrderId: true,
      item: true,
      description: true,
      qty: true,
      itemCost: true,
      totalCost: true,
    },
  });

  if (!existing) return NextResponse.json({ error: 'Purchase item not found' }, { status: 404 });

  const lineDescription = (existing.description || '').trim() || existing.item;
  const qty = Number(existing.qty);
  const itemCost = Number(existing.itemCost);
  const totalCost = Number(existing.totalCost);
  const unitPrice = itemCost > 0 ? itemCost : (qty > 0 ? totalCost / qty : 0);

  if (!lineDescription || qty <= 0 || unitPrice <= 0) {
    return NextResponse.json({ error: 'Purchase row must have description, qty, and cost before converting' }, { status: 400 });
  }

  const createdLine = await prisma.$transaction(async (tx) => {
    const lastLine = await tx.salesOrderLine.findFirst({
      where: { salesOrderId: existing.salesOrderId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const line = await tx.salesOrderLine.create({
      data: {
        salesOrderId: existing.salesOrderId,
        description: lineDescription,
        qty,
        unitPrice,
        sortOrder: (lastLine?.sortOrder || 0) + 1,
      },
    });

    await tx.salesOrderPurchaseItem.delete({ where: { id: existing.id } });
    return line;
  });

  return NextResponse.json({ ok: true, line: createdLine }, { status: 201 });
}
