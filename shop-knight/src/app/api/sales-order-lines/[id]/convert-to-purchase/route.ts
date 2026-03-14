import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

function toNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toMoney(v: number | null) {
  if (v === null) return null;
  return Math.round(v * 100) / 100;
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'PURCHASING', 'OPERATIONS', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const line = await prisma.salesOrderLine.findFirst({
    where: { id, salesOrder: withCompany(companyId) },
    select: { id: true, salesOrderId: true, description: true, qty: true, unitPrice: true },
  });
  if (!line) return NextResponse.json({ error: 'Sales order line not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const itemInput = String(body?.item || '').trim();
  const description = body?.description ? String(body.description).trim() : null;
  const item = itemInput || description || line.description || 'Purchase Item';

  const qtyRaw = toNum(body?.qty);
  const qty = qtyRaw === null ? null : Math.trunc(qtyRaw);
  if (qty === null || qty <= 0 || qty !== qtyRaw) {
    return NextResponse.json({ error: 'qty is required (must be a whole number)' }, { status: 400 });
  }

  let itemCost = toMoney(toNum(body?.itemCost));
  let totalCost = toMoney(toNum(body?.totalCost));

  if ((itemCost === null || itemCost <= 0) && (totalCost === null || totalCost <= 0)) {
    return NextResponse.json({ error: 'enter item cost or total cost' }, { status: 400 });
  }
  if ((itemCost === null || itemCost <= 0) && totalCost !== null) itemCost = toMoney(totalCost / qty);
  if ((totalCost === null || totalCost <= 0) && itemCost !== null) totalCost = toMoney(itemCost * qty);

  const purchasedBy = String(body?.purchasedBy || 'CREDIT_CARD') === 'ON_ACCOUNT' ? 'ON_ACCOUNT' : 'CREDIT_CARD';
  const vendorName = body?.vendorName ? String(body.vendorName).trim() : '';

  let vendorId: string | null = null;
  if (vendorName) {
    const existingVendor = await prisma.vendor.findFirst({ where: { name: { equals: vendorName, mode: 'insensitive' }, companyId } });
    if (existingVendor) vendorId = existingVendor.id;
    else {
      const createdVendor = await prisma.vendor.create({ data: { name: vendorName, companyId } });
      vendorId = createdVendor.id;
    }
  }

  if (purchasedBy === 'ON_ACCOUNT' && !vendorId) {
    return NextResponse.json({ error: 'vendor is required for Purchase Order' }, { status: 400 });
  }

  const so = await prisma.salesOrder.findFirst({ where: withCompany(companyId, { id: line.salesOrderId }), select: { orderNumber: true } });
  if (!so) return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });

  const count = await prisma.salesOrderPurchaseItem.count({ where: { salesOrderId: line.salesOrderId } });
  let poNumber: string | null = null;
  if (purchasedBy === 'ON_ACCOUNT') {
    const existingOnAccount = await prisma.salesOrderPurchaseItem.count({ where: { salesOrderId: line.salesOrderId, purchasedBy: 'ON_ACCOUNT' } });
    poNumber = `${so.orderNumber}-${existingOnAccount + 1}`;
  }

  const purchase = await prisma.salesOrderPurchaseItem.create({
    data: {
      salesOrderId: line.salesOrderId,
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

  return NextResponse.json({ ok: true, purchase }, { status: 201 });
}
