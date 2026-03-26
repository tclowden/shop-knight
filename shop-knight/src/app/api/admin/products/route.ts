import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions } from '@/lib/api-auth';

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

async function generateNextProductNumber(companyId: string) {
  const rows = await prisma.$queryRaw<Array<{ nextnum: number }>>`
    SELECT COALESCE(MAX(CASE WHEN "sku" ~ '^[0-9]+$' THEN "sku"::bigint ELSE 0 END), 0) + 1 AS nextnum
    FROM "Product"
    WHERE "companyId" = ${companyId}
  `;

  const next = Number(rows?.[0]?.nextnum || 1);
  return String(Number.isFinite(next) && next > 0 ? next : 1);
}

export async function GET(req: Request) {
  const auth = await requirePermissions(['admin.products.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const archivedMode = searchParams.get('archived');

  const products = await prisma.product.findMany({
    where: {
      companyId,
      ...(archivedMode === 'only'
        ? { active: false }
        : archivedMode === 'all'
          ? {}
          : { active: true }),
    },
    include: {
      attributes: { orderBy: { sortOrder: 'asc' } },
      department: { select: { id: true, name: true } },
      incomeAccount: { select: { id: true, code: true, name: true } },
      productCategory: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const auth = await requirePermissions(['admin.products.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json();
  const requestedSku = String(body?.sku || '').trim();
  const name = String(body?.name || '').trim();
  const salePrice = toNumber(body?.salePrice);
  const costPrice = body?.costPrice === '' || body?.costPrice === undefined ? null : toNumber(body?.costPrice);
  const gpmPercent = body?.gpmPercent === '' || body?.gpmPercent === undefined ? null : toNumber(body?.gpmPercent);
  const departmentId = body?.departmentId ? String(body.departmentId) : null;
  const incomeAccountId = body?.incomeAccountId ? String(body.incomeAccountId) : null;
  const categoryId = body?.categoryId ? String(body.categoryId) : null;

  if (!name || salePrice === null) {
    return NextResponse.json({ error: 'name and salePrice are required' }, { status: 400 });
  }
  if (!body?.type || !departmentId || !incomeAccountId || !categoryId) {
    return NextResponse.json({ error: 'type, departmentId, incomeAccountId, and categoryId are required' }, { status: 400 });
  }

  if (departmentId) {
    const d = await prisma.department.findFirst({ where: { id: departmentId, companyId } });
    if (!d) return NextResponse.json({ error: 'Invalid department' }, { status: 400 });
  }
  if (incomeAccountId) {
    const ia = await prisma.incomeAccount.findFirst({ where: { id: incomeAccountId, companyId } });
    if (!ia) return NextResponse.json({ error: 'Invalid income account' }, { status: 400 });
  }
  if (categoryId) {
    const c = await prisma.productCategory.findFirst({ where: { id: categoryId, companyId } });
    if (!c) return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  try {
    let attempts = 0;
    while (attempts < 3) {
      attempts += 1;
      const sku = requestedSku || await generateNextProductNumber(companyId);

      try {
        const created = await prisma.product.create({
          data: {
            companyId,
            sku,
            name,
            type: body?.type ? String(body.type) : null,
            departmentId,
            incomeAccountId,
            categoryId,
            category: body?.category ? String(body.category) : null,
            description: body?.description ? String(body.description) : null,
            uom: body?.uom ? String(body.uom) : 'EA',
            salePrice,
            costPrice,
            gpmPercent,
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
          (error as { code?: string }).code === 'P2002' &&
          !requestedSku
        ) {
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json({ error: 'Failed to auto-assign product number. Please try again.' }, { status: 409 });
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return NextResponse.json({ error: 'Product number already exists' }, { status: 409 });
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
