import { NextResponse } from 'next/server';
import { PricingEffectType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions } from '@/lib/api-auth';

async function ensureAttributeInCompany(productId: string, attributeId: string, companyId: string) {
  return prisma.productAttribute.findFirst({
    where: { id: attributeId, productId, product: { companyId } },
    select: { id: true },
  });
}

function isNumeric(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  return Number.isFinite(Number(value));
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string; attributeId: string }> }) {
  const auth = await requirePermissions(['admin.products.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id, attributeId } = await params;
  const attribute = await ensureAttributeInCompany(id, attributeId, companyId);
  if (!attribute) return NextResponse.json({ error: 'Attribute not found' }, { status: 404 });

  const options = await prisma.productAttributeOption.findMany({
    where: { attributeId, active: true },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json(options);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string; attributeId: string }> }) {
  const auth = await requirePermissions(['admin.products.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id, attributeId } = await params;
  const attribute = await ensureAttributeInCompany(id, attributeId, companyId);
  if (!attribute) return NextResponse.json({ error: 'Attribute not found' }, { status: 404 });

  const body = await req.json();
  const label = String(body?.label || '').trim();
  if (!label) return NextResponse.json({ error: 'label is required' }, { status: 400 });

  const created = await prisma.productAttributeOption.create({
    data: {
      attributeId,
      label,
      value: body?.value == null ? null : String(body.value),
      sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0,
      priceEffectType: (body?.priceEffectType as PricingEffectType | undefined) ?? PricingEffectType.NONE,
      priceEffectValue: isNumeric(body?.priceEffectValue) ? Number(body.priceEffectValue) : null,
      costEffectValue: isNumeric(body?.costEffectValue) ? Number(body.costEffectValue) : null,
      formulaVarName: body?.formulaVarName == null ? null : String(body.formulaVarName),
      active: body?.active === false ? false : true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
