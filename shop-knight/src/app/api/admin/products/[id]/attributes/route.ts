import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions } from '@/lib/api-auth';
import { PricingEffectType } from '@prisma/client';

async function ensureProductInCompany(productId: string, companyId: string) {
  return prisma.product.findFirst({ where: { id: productId, companyId }, select: { id: true } });
}

function isNumeric(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  return Number.isFinite(Number(value));
}

type OptionInput = {
  label: string;
  value?: string | null;
  sortOrder?: number;
  priceEffectType?: PricingEffectType;
  priceEffectValue?: number | string | null;
  costEffectValue?: number | string | null;
  formulaVarName?: string | null;
  active?: boolean;
};

function normalizeOptionInputs(rawOptions: unknown): OptionInput[] {
  if (!Array.isArray(rawOptions)) return [];

  const normalized: OptionInput[] = [];
  for (let index = 0; index < rawOptions.length; index += 1) {
    const opt = rawOptions[index];
    if (typeof opt === 'string') {
      const parts = opt.split('|').map((p) => p.trim());
      const label = parts[0] || '';
      if (!label) continue;
      const price = parts[1];
      const cost = parts[2];
      const hasPrice = isNumeric(price);

      normalized.push({
        label,
        sortOrder: index,
        priceEffectType: hasPrice ? PricingEffectType.ADD : PricingEffectType.NONE,
        priceEffectValue: hasPrice ? Number(price) : null,
        costEffectValue: isNumeric(cost) ? Number(cost) : null,
      });
      continue;
    }

    if (opt && typeof opt === 'object') {
      const row = opt as Record<string, unknown>;
      const label = String(row.label ?? '').trim();
      if (!label) continue;
      normalized.push({
        label,
        value: row.value == null ? null : String(row.value),
        sortOrder: row.sortOrder == null ? index : Number(row.sortOrder),
        priceEffectType: (row.priceEffectType as PricingEffectType | undefined) ?? PricingEffectType.NONE,
        priceEffectValue: row.priceEffectValue as number | string | null | undefined,
        costEffectValue: row.costEffectValue as number | string | null | undefined,
        formulaVarName: row.formulaVarName == null ? null : String(row.formulaVarName),
        active: row.active == null ? true : Boolean(row.active),
      });
    }
  }

  return normalized;
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
    include: { options: { where: { active: true }, orderBy: { sortOrder: 'asc' } } },
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

  const normalizedOptions = normalizeOptionInputs(body?.options);

  try {
    const created = await prisma.productAttribute.create({
      data: {
        productId: id,
        code,
        name,
        inputType: inputType as 'TEXT' | 'NUMBER' | 'SELECT' | 'MULTI_SELECT' | 'BOOLEAN',
        required: Boolean(body?.required),
        sortOrder: Number(body?.sortOrder || 0),
        defaultValue: body?.defaultValue ? String(body.defaultValue) : null,
        legacyOptions: Array.isArray(body?.options) ? body.options : null,
        options: normalizedOptions.length
          ? {
              create: normalizedOptions.map((opt, index) => ({
                label: opt.label,
                value: opt.value ?? null,
                sortOrder: Number.isFinite(Number(opt.sortOrder)) ? Number(opt.sortOrder) : index,
                priceEffectType: opt.priceEffectType ?? PricingEffectType.NONE,
                priceEffectValue: isNumeric(opt.priceEffectValue) ? Number(opt.priceEffectValue) : null,
                costEffectValue: isNumeric(opt.costEffectValue) ? Number(opt.costEffectValue) : null,
                formulaVarName: opt.formulaVarName ?? null,
                active: opt.active ?? true,
              })),
            }
          : undefined,
      },
      include: { options: { where: { active: true }, orderBy: { sortOrder: 'asc' } } },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Attribute code already exists for this product' }, { status: 409 });
  }
}
