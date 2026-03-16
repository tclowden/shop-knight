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

  const attrs = await prisma.productAttribute.findMany({
    where: { productId: id },
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json(attrs);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissions(['admin.products.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const product = await ensureProductInCompany(id, companyId);
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const body = await req.json();

  const code = String(body?.code || '').trim();
  const name = String(body?.name || '').trim();
  const inputType = String(body?.inputType || 'TEXT');

  if (!code || !name) {
    return NextResponse.json({ error: 'code and name are required' }, { status: 400 });
  }

  try {
    const created = await prisma.productAttribute.create({
      data: {
        productId: id,
        code,
        name,
        inputType: inputType as 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN',
        required: Boolean(body?.required),
        sortOrder: Number(body?.sortOrder || 0),
        defaultValue: body?.defaultValue ? String(body.defaultValue) : null,
        options: Array.isArray(body?.options) ? body.options : null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Attribute code already exists for this product' }, { status: 409 });
  }
}
