import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requirePermissions(['admin.inventory.manage']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.inventoryItem.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  const now = new Date();
  const overlap = await prisma.inventoryReservation.aggregate({
    where: withCompany(companyId, {
      inventoryItemId: id,
      active: true,
      reservedFrom: { lte: now },
      reservedTo: { gte: now },
    }),
    _sum: { quantity: true },
  });

  const reservedQty = Number(overlap._sum.quantity || 0);
  const checkedOutQty = Number(existing.checkedOutQty || 0);
  const totalQty = Number(existing.totalQty || 0);
  const availableQty = totalQty - reservedQty - checkedOutQty;

  return NextResponse.json({ ...existing, reservedQty, availableQty });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requirePermissions(['admin.inventory.manage']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.inventoryItem.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? existing.name).trim();
  const category = body?.category === '' ? null : body?.category !== undefined ? String(body.category) : existing.category;
  const location = body?.location === '' ? null : body?.location !== undefined ? String(body.location) : existing.location;
  const notes = body?.notes === '' ? null : body?.notes !== undefined ? String(body.notes) : existing.notes;
  const totalQtyRaw = body?.totalQty;
  const checkedOutQtyRaw = body?.checkedOutQty;
  const totalQty = totalQtyRaw === undefined ? existing.totalQty : Number(totalQtyRaw);
  const checkedOutQty = checkedOutQtyRaw === undefined ? existing.checkedOutQty : Number(checkedOutQtyRaw);

  if (!name || !Number.isFinite(totalQty) || totalQty < 0 || !Number.isFinite(checkedOutQty) || checkedOutQty < 0) {
    return NextResponse.json({ error: 'name, totalQty (>=0), and checkedOutQty (>=0) are required' }, { status: 400 });
  }

  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: {
      name,
      category,
      location,
      notes,
      totalQty: Math.floor(totalQty),
      checkedOutQty: Math.floor(checkedOutQty),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requirePermissions(['admin.inventory.manage']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.inventoryItem.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  const updated = await prisma.inventoryItem.update({ where: { id }, data: { active: false } });
  return NextResponse.json(updated);
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requirePermissions(['admin.inventory.manage']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { id } = await ctx.params;

  if (body?.action === 'restore') {
    const existing = await prisma.inventoryItem.findFirst({ where: withCompany(companyId, { id }) });
    if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    const updated = await prisma.inventoryItem.update({ where: { id }, data: { active: true } });
    return NextResponse.json(updated);
  }

  if (body?.action === 'updateQty') {
    const qty = Number(body?.totalQty);
    if (!Number.isFinite(qty) || qty < 0) return NextResponse.json({ error: 'totalQty must be >= 0' }, { status: 400 });
    const existing = await prisma.inventoryItem.findFirst({ where: withCompany(companyId, { id }) });
    if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    const updated = await prisma.inventoryItem.update({ where: { id }, data: { totalQty: Math.floor(qty) } });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}
