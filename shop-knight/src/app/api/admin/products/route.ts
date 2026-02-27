import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS']);
  if (!auth.ok) return auth.response;

  const products = await prisma.product.findMany({
    where: { active: true },
    include: { attributes: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const sku = String(body?.sku || '').trim();
  const name = String(body?.name || '').trim();
  const salePrice = toNumber(body?.salePrice);
  const costPrice = body?.costPrice === '' || body?.costPrice === undefined ? null : toNumber(body?.costPrice);

  if (!sku || !name || salePrice === null) {
    return NextResponse.json({ error: 'sku, name, and salePrice are required' }, { status: 400 });
  }

  try {
    const created = await prisma.product.create({
      data: {
        sku,
        name,
        category: body?.category ? String(body.category) : null,
        description: body?.description ? String(body.description) : null,
        uom: body?.uom ? String(body.uom) : 'EA',
        salePrice,
        costPrice,
        taxable: body?.taxable === false ? false : true,
        active: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
  }
}
