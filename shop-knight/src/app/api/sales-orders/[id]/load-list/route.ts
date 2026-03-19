import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const lists = await prisma.loadList.findMany({
    where: { salesOrderId: id },
    orderBy: { createdAt: 'desc' },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });

  return NextResponse.json(lists);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const selectedLineIds = Array.isArray(body?.selectedLineIds)
    ? body.selectedLineIds.map((v: unknown) => String(v)).filter(Boolean)
    : [];

  const customItemsRaw: unknown[] = Array.isArray(body?.customItems) ? body.customItems : [];
  const customItems: Array<{ item: string; qty: number }> = customItemsRaw.reduce((acc: Array<{ item: string; qty: number }>, entry: unknown) => {
    const item = String((entry as { item?: unknown })?.item || '').trim();
    const qtyRaw = Number((entry as { qty?: unknown })?.qty ?? 1);
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;
    if (item) acc.push({ item, qty });
    return acc;
  }, []);

  if (selectedLineIds.length === 0 && customItems.length === 0) {
    return NextResponse.json({ error: 'Select one or more lines or add custom items.' }, { status: 400 });
  }

  const lines = selectedLineIds.length
    ? await prisma.salesOrderLine.findMany({
        where: { salesOrderId: id, id: { in: selectedLineIds } },
        orderBy: { sortOrder: 'asc' },
      })
    : [];

  const created = await prisma.loadList.create({
    data: {
      salesOrderId: id,
      name: String(body?.name || 'Load List').trim() || 'Load List',
      items: {
        create: [
          ...lines.map((line, idx) => ({
            salesOrderLineId: line.id,
            item: line.description,
            qty: Number(line.qty) || 1,
            sortOrder: idx + 1,
          })),
          ...customItems.map((entry, idx) => ({
            item: entry.item,
            qty: entry.qty,
            sortOrder: lines.length + idx + 1,
          })),
        ],
      },
    },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });

  return NextResponse.json(created, { status: 201 });
}
