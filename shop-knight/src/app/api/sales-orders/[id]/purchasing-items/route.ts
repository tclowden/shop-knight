import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

function toNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'PURCHASING', 'OPERATIONS', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const so = await prisma.salesOrder.findFirst({ where: withCompany(companyId, { id }), select: { id: true } });
  if (!so) return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });

  const items = await prisma.salesOrderPurchaseItem.findMany({
    where: { salesOrderId: id },
    include: { vendor: { select: { id: true, name: true } } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json(items);
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'PURCHASING', 'OPERATIONS', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  try {
    const { id } = await ctx.params;
    const so = await prisma.salesOrder.findFirst({ where: withCompany(companyId, { id }), select: { id: true, orderNumber: true } });
    if (!so) return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const item = String(body?.item || '').trim();
    const description = body?.description ? String(body.description).trim() : null;
    const qty = toNum(body?.qty);
    const itemCostInput = toNum(body?.itemCost);
    const totalCostInput = toNum(body?.totalCost);
    const purchasedBy = String(body?.purchasedBy || 'CREDIT_CARD') === 'ON_ACCOUNT' ? 'ON_ACCOUNT' : 'CREDIT_CARD';
    const vendorName = body?.vendorName ? String(body.vendorName).trim() : '';

    if (!item || qty === null || qty <= 0) {
      return NextResponse.json({ error: 'item and qty are required' }, { status: 400 });
    }

    let itemCost = itemCostInput;
    let totalCost = totalCostInput;

    if ((itemCost === null || itemCost <= 0) && (totalCost === null || totalCost <= 0)) {
      return NextResponse.json({ error: 'enter item cost or total cost' }, { status: 400 });
    }

    if ((itemCost === null || itemCost <= 0) && totalCost !== null) {
      itemCost = totalCost / qty;
    }
    if ((totalCost === null || totalCost <= 0) && itemCost !== null) {
      totalCost = itemCost * qty;
    }

    let vendorId: string | null = null;
    if (vendorName) {
      const existingVendor = await prisma.vendor.findFirst({ where: { name: { equals: vendorName, mode: 'insensitive' }, companyId } });
      if (existingVendor) {
        vendorId = existingVendor.id;
      } else {
        try {
          const vendor = await prisma.vendor.create({ data: { name: vendorName, companyId } });
          vendorId = vendor.id;
        } catch {
          const fallbackVendor = await prisma.vendor.findFirst({ where: { name: { equals: vendorName, mode: 'insensitive' }, companyId } });
          vendorId = fallbackVendor?.id || null;
        }
      }
    }

    if (purchasedBy === 'ON_ACCOUNT' && !vendorId) {
      return NextResponse.json({ error: 'vendor is required for Purchase Order' }, { status: 400 });
    }

    const count = await prisma.salesOrderPurchaseItem.count({ where: { salesOrderId: id } });

    let poNumber: string | null = null;
    if (purchasedBy === 'ON_ACCOUNT') {
      const existingOnAccount = await prisma.salesOrderPurchaseItem.count({ where: { salesOrderId: id, purchasedBy: 'ON_ACCOUNT' } });
      poNumber = `${so.orderNumber}-${existingOnAccount + 1}`;
    }

    const created = await prisma.salesOrderPurchaseItem.create({
      data: {
        salesOrderId: id,
        vendorId,
        item,
        description,
        qty,
        itemCost: itemCost ?? 0,
        totalCost: totalCost ?? 0,
        purchasedBy,
        poNumber,
        sortOrder: count + 1,
      },
      include: { vendor: { select: { id: true, name: true } } },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save purchase row', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
