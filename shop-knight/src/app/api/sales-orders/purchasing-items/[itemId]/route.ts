import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

function toNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type Ctx = { params: Promise<{ itemId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'PURCHASING', 'OPERATIONS', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { itemId } = await ctx.params;
  const existing = await prisma.salesOrderPurchaseItem.findFirst({
    where: { id: itemId, salesOrder: withCompany(companyId) },
    include: { salesOrder: { select: { orderNumber: true } } },
  });
  if (!existing) return NextResponse.json({ error: 'Purchase item not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  const nextQty = body?.qty !== undefined ? toNum(body.qty) : existing.qty;
  const nextItemCostInput = body?.itemCost !== undefined ? toNum(body.itemCost) : Number(existing.itemCost);
  const nextTotalCostInput = body?.totalCost !== undefined ? toNum(body.totalCost) : Number(existing.totalCost);

  if (nextQty === null || nextQty <= 0) {
    return NextResponse.json({ error: 'qty must be > 0' }, { status: 400 });
  }

  let nextItemCost = nextItemCostInput;
  let nextTotalCost = nextTotalCostInput;

  if ((nextItemCost === null || nextItemCost <= 0) && nextTotalCost !== null) {
    nextItemCost = nextTotalCost / nextQty;
  }
  if ((nextTotalCost === null || nextTotalCost <= 0) && nextItemCost !== null) {
    nextTotalCost = nextItemCost * nextQty;
  }

  const nextPurchasedBy = body?.purchasedBy !== undefined
    ? (String(body.purchasedBy) === 'ON_ACCOUNT' ? 'ON_ACCOUNT' : 'CREDIT_CARD')
    : existing.purchasedBy;

  const vendorName = body?.vendorName !== undefined ? String(body.vendorName || '').trim() : undefined;
  let vendorId = existing.vendorId;
  if (vendorName !== undefined) {
    if (!vendorName) vendorId = null;
    else {
      const existingVendor = await prisma.vendor.findFirst({ where: { name: vendorName, companyId } });
      const vendor = existingVendor ?? await prisma.vendor.create({ data: { name: vendorName, companyId } });
      vendorId = vendor.id;
    }
  }

  if (nextPurchasedBy === 'ON_ACCOUNT' && !vendorId) {
    return NextResponse.json({ error: 'vendor is required for Purchase Order' }, { status: 400 });
  }

  let poNumber = existing.poNumber;
  if (nextPurchasedBy === 'ON_ACCOUNT' && !poNumber) {
    const onAccountCount = await prisma.salesOrderPurchaseItem.count({
      where: { salesOrderId: existing.salesOrderId, purchasedBy: 'ON_ACCOUNT' },
    });
    poNumber = `${existing.salesOrder.orderNumber}-${onAccountCount + 1}`;
  }
  if (nextPurchasedBy === 'CREDIT_CARD') {
    poNumber = null;
  }

  const updated = await prisma.salesOrderPurchaseItem.update({
    where: { id: itemId },
    data: {
      item: body?.item !== undefined ? String(body.item) : undefined,
      description: body?.description !== undefined ? (body.description ? String(body.description) : null) : undefined,
      vendorId,
      qty: nextQty,
      itemCost: nextItemCost ?? 0,
      totalCost: nextTotalCost ?? 0,
      purchasedBy: nextPurchasedBy,
      poNumber,
    },
    include: { vendor: { select: { id: true, name: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, ctx: Ctx) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'PURCHASING', 'OPERATIONS', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { itemId } = await ctx.params;
  const existing = await prisma.salesOrderPurchaseItem.findFirst({ where: { id: itemId, salesOrder: withCompany(companyId) } });
  if (!existing) return NextResponse.json({ error: 'Purchase item not found' }, { status: 404 });

  await prisma.salesOrderPurchaseItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
