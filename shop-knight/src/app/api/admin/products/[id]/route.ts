import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions } from '@/lib/api-auth';

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissions(['admin.products.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.product.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const departmentId = body?.departmentId !== undefined ? (body?.departmentId ? String(body.departmentId) : null) : undefined;
  const incomeAccountId = body?.incomeAccountId !== undefined ? (body?.incomeAccountId ? String(body.incomeAccountId) : null) : undefined;
  const categoryId = body?.categoryId !== undefined ? (body?.categoryId ? String(body.categoryId) : null) : undefined;

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

  let salePriceData: number | undefined;
  if (body?.salePrice !== undefined) {
    const parsed = toNumber(body.salePrice);
    if (parsed === null) return NextResponse.json({ error: 'Invalid salePrice' }, { status: 400 });
    salePriceData = parsed;
  }

  const costPriceParsed = body?.costPrice !== undefined ? (body.costPrice === '' ? null : toNumber(body.costPrice)) : undefined;
  const gpmParsed = body?.gpmPercent !== undefined ? (body.gpmPercent === '' ? null : toNumber(body.gpmPercent)) : undefined;

  const updated = await prisma.product.update({
    where: { id },
    data: {
      pricingFormula: body?.pricingFormula !== undefined ? (body?.pricingFormula ? String(body.pricingFormula) : null) : undefined,
      name: body?.name ? String(body.name) : undefined,
      type: body?.type !== undefined ? String(body.type || '') : undefined,
      description: body?.description !== undefined ? String(body.description || '') : undefined,
      category: body?.category !== undefined ? String(body.category || '') : undefined,
      categoryId,
      departmentId,
      incomeAccountId,
      salePrice: salePriceData,
      costPrice: costPriceParsed,
      gpmPercent: gpmParsed,
      taxable: body?.taxable !== undefined ? Boolean(body.taxable) : undefined,
      uom: body?.uom !== undefined ? String(body.uom || 'EA') : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissions(['admin.products.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.product.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  await prisma.product.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true, archived: true });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissions(['admin.products.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  if (body?.action !== 'restore') return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.product.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  await prisma.product.update({ where: { id }, data: { active: true } });
  return NextResponse.json({ ok: true, restored: true });
}
