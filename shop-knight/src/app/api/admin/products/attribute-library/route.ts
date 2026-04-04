import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions } from '@/lib/api-auth';

export async function GET() {
  const auth = await requirePermissions(['admin.products.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const attrs = await prisma.productAttribute.findMany({
    where: { product: { companyId } },
    include: {
      options: {
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
        select: { label: true, value: true, priceEffectType: true, priceEffectValue: true },
      },
    },
    orderBy: [{ name: 'asc' }, { code: 'asc' }],
  });

  const map = new Map<string, {
    code: string;
    name: string;
    inputType: string;
    required: boolean;
    defaultValue: string | null;
    optionsCsv: string;
    pricingImpact: 'NONE' | 'FIXED_ADD' | 'PER_SQ_UNIT' | 'MULTIPLIER';
  }>();

  for (const attr of attrs) {
    const key = attr.code.trim().toLowerCase();
    if (!key || map.has(key)) continue;

    const optionsFromTable = (attr.options || []).map((opt) => {
      const value = typeof opt.priceEffectValue === 'object' && opt.priceEffectValue !== null && 'toString' in opt.priceEffectValue
        ? opt.priceEffectValue.toString()
        : null;
      return value ? `${opt.label}|${value}` : (opt.value || opt.label);
    });

    const legacyOptions = Array.isArray(attr.legacyOptions)
      ? attr.legacyOptions.map((v) => String(v)).filter(Boolean)
      : [];

    const optionsCsv = [...optionsFromTable, ...legacyOptions].join('\n');

    const pricingImpact = attr.options.some((opt) => opt.priceEffectType === 'ADD')
      ? 'FIXED_ADD'
      : attr.options.some((opt) => opt.priceEffectType === 'MULTIPLY')
        ? 'MULTIPLIER'
        : 'NONE';

    map.set(key, {
      code: attr.code,
      name: attr.name,
      inputType: attr.inputType,
      required: attr.required,
      defaultValue: attr.defaultValue,
      optionsCsv,
      pricingImpact,
    });
  }

  const items = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json(items);
}
