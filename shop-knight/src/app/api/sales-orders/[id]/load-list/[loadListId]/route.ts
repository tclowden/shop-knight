import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string; loadListId: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const { id, loadListId } = await params;
  const loadList = await prisma.loadList.findFirst({
    where: { id: loadListId, salesOrderId: id },
    include: {
      salesOrder: { select: { id: true, orderNumber: true, title: true, opportunity: { select: { name: true, customer: { select: { name: true } } } } } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!loadList) return NextResponse.json({ error: 'Load list not found' }, { status: 404 });
  return NextResponse.json(loadList);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; loadListId: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const { id, loadListId } = await params;
  const body = await req.json().catch(() => ({}));

  const list = await prisma.loadList.findFirst({ where: { id: loadListId, salesOrderId: id }, select: { id: true } });
  if (!list) return NextResponse.json({ error: 'Load list not found' }, { status: 404 });

  const name = String(body?.name || 'Load List').trim() || 'Load List';
  const incoming = Array.isArray(body?.items) ? body.items : [];

  const items: Array<{ item: string; qty: number; salesOrderLineId: string | null }> = incoming.reduce((acc: Array<{ item: string; qty: number; salesOrderLineId: string | null }>, entry: unknown) => {
    const item = String((entry as { item?: unknown })?.item || '').trim();
    const qtyRaw = Number((entry as { qty?: unknown })?.qty ?? 1);
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;
    const salesOrderLineId = (entry as { salesOrderLineId?: unknown })?.salesOrderLineId ? String((entry as { salesOrderLineId?: unknown }).salesOrderLineId) : null;
    if (item) acc.push({ item, qty, salesOrderLineId });
    return acc;
  }, []);

  if (items.length === 0) {
    return NextResponse.json({ error: 'Load list must have at least one item' }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.loadList.update({ where: { id: loadListId }, data: { name } });
    await tx.loadListItem.deleteMany({ where: { loadListId } });
    await tx.loadListItem.createMany({
      data: items.map((entry, idx) => ({
        loadListId,
        salesOrderLineId: entry.salesOrderLineId,
        item: entry.item,
        qty: entry.qty,
        sortOrder: idx + 1,
      })),
    });

    return tx.loadList.findUnique({ where: { id: loadListId }, include: { items: { orderBy: { sortOrder: 'asc' } } } });
  });

  return NextResponse.json(updated);
}
