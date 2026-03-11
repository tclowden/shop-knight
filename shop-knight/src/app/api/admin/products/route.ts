import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermissions } from '@/lib/api-auth';

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export async function GET(req: Request) {
  const auth = await requirePermissions(['admin.products.manage']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const archivedMode = searchParams.get('archived');

  const products = await prisma.product.findMany({
    where: archivedMode === 'only'
      ? { active: false }
      : archivedMode === 'all'
        ? {}
        : { active: true },
    include: { attributes: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const auth = await requirePermissions(['admin.products.manage']);
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
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
    }

    return NextResponse.json(
      {
        error: 'Failed to create product',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
