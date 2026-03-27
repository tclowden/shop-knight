import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions } from '@/lib/api-auth';

async function ensureProductInCompany(productId: string, companyId: string) {
  return prisma.product.findFirst({ where: { id: productId, companyId }, select: { id: true } });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissions(['admin.products.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const product = await ensureProductInCompany(id, companyId);
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const grid = await prisma.productPricingGrid.findUnique({
    where: { productId: id },
    include: { cells: { orderBy: [{ yIndex: 'asc' }, { xIndex: 'asc' }] } },
  });

  return NextResponse.json(grid);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissions(['admin.products.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const product = await ensureProductInCompany(id, companyId);
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const body = await req.json();

  const xBreaks = Array.isArray(body?.xBreaks) ? body.xBreaks : [];
  const yBreaks = Array.isArray(body?.yBreaks) ? body.yBreaks : [];
  const cells = Array.isArray(body?.cells) ? body.cells : [];

  const updated = await prisma.$transaction(async (tx) => {
    const grid = await tx.productPricingGrid.upsert({
      where: { productId: id },
      create: {
        productId: id,
        xAxisLabel: body?.xAxisLabel ? String(body.xAxisLabel) : null,
        yAxisLabel: body?.yAxisLabel ? String(body.yAxisLabel) : null,
        xBreaks,
        yBreaks,
      },
      update: {
        xAxisLabel: body?.xAxisLabel ? String(body.xAxisLabel) : null,
        yAxisLabel: body?.yAxisLabel ? String(body.yAxisLabel) : null,
        xBreaks,
        yBreaks,
      },
    });

    await tx.productPricingGridCell.deleteMany({ where: { gridId: grid.id } });

    if (cells.length > 0) {
      await tx.productPricingGridCell.createMany({
        data: cells
          .map((cell: Record<string, unknown>) => ({
            gridId: grid.id,
            xIndex: Number(cell.xIndex),
            yIndex: Number(cell.yIndex),
            unitPrice: Number(cell.unitPrice),
          }))
          .filter((cell: { xIndex: number; yIndex: number; unitPrice: number }) => Number.isFinite(cell.xIndex) && Number.isFinite(cell.yIndex) && Number.isFinite(cell.unitPrice)),
      });
    }

    return tx.productPricingGrid.findUnique({
      where: { id: grid.id },
      include: { cells: { orderBy: [{ yIndex: 'asc' }, { xIndex: 'asc' }] } },
    });
  });

  return NextResponse.json(updated);
}
