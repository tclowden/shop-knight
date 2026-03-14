import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ itemId: string }> };

export async function POST(req: Request, ctx: Ctx) {
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

  const body = await req.json().catch(() => ({}));

  const defaultDescription = (existing.description || '').trim() || existing.item;
  const qty = body?.qty !== undefined ? Number(body.qty) : Number(existing.qty);
  const unitPrice = body?.unitPrice !== undefined ? Number(body.unitPrice) : Number(existing.itemCost);
  const description = String(body?.description || defaultDescription).trim();

  if (!description || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0) {
    return NextResponse.json({ error: 'description, qty, and unit price are required to convert' }, { status: 400 });
  }

  const lastLine = await prisma.salesOrderLine.findFirst({
    where: { salesOrderId: existing.salesOrderId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const createdLine = await prisma.salesOrderLine.create({
    data: {
      salesOrderId: existing.salesOrderId,
      description,
      qty: Math.trunc(qty),
      unitPrice,
      sortOrder: (lastLine?.sortOrder || 0) + 1,
    },
  });

  return NextResponse.json({ ok: true, line: createdLine }, { status: 201 });
}
