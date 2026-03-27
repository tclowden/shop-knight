import { NextResponse } from 'next/server';
import { PricingEffectType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions } from '@/lib/api-auth';

async function ensureOptionInCompany(productId: string, attributeId: string, optionId: string, companyId: string) {
  return prisma.productAttributeOption.findFirst({
    where: {
      id: optionId,
      attributeId,
      attribute: { productId, product: { companyId } },
    },
    select: { id: true },
  });
}

function isNumeric(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  return Number.isFinite(Number(value));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; attributeId: string; optionId: string }> }) {
  const auth = await requirePermissions(['admin.products.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id, attributeId, optionId } = await params;
  const option = await ensureOptionInCompany(id, attributeId, optionId, companyId);
  if (!option) return NextResponse.json({ error: 'Option not found' }, { status: 404 });

  const body = await req.json();

  const updated = await prisma.productAttributeOption.update({
    where: { id: optionId },
    data: {
      label: body?.label !== undefined ? String(body.label || '').trim() : undefined,
      value: body?.value !== undefined ? (body.value == null ? null : String(body.value)) : undefined,
      sortOrder: body?.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
      priceEffectType: body?.priceEffectType !== undefined ? (body.priceEffectType as PricingEffectType) : undefined,
      priceEffectValue: body?.priceEffectValue !== undefined ? (isNumeric(body.priceEffectValue) ? Number(body.priceEffectValue) : null) : undefined,
      costEffectValue: body?.costEffectValue !== undefined ? (isNumeric(body.costEffectValue) ? Number(body.costEffectValue) : null) : undefined,
      formulaVarName: body?.formulaVarName !== undefined ? (body.formulaVarName == null ? null : String(body.formulaVarName)) : undefined,
      active: body?.active !== undefined ? Boolean(body.active) : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; attributeId: string; optionId: string }> }) {
  const auth = await requirePermissions(['admin.products.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id, attributeId, optionId } = await params;
  const option = await ensureOptionInCompany(id, attributeId, optionId, companyId);
  if (!option) return NextResponse.json({ error: 'Option not found' }, { status: 404 });

  await prisma.productAttributeOption.update({ where: { id: optionId }, data: { active: false } });
  return NextResponse.json({ ok: true, deleted: true, soft: true });
}
