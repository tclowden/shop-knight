import { MaterialFixedSide, MaterialFormulaType, MaterialUnit, MaterialWeightUom, QuickbooksItemType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

const nullableString = z.string().trim().optional().nullable();
const nullableNumber = z.coerce.number().optional().nullable();

const schema = z.object({
  name: z.string().trim().min(1),
  externalName: nullableString,
  materialTypeId: nullableString,
  materialCategoryId: nullableString,
  sellingUnit: z.nativeEnum(MaterialUnit).optional().nullable(),
  buyingUnit: z.nativeEnum(MaterialUnit).optional().nullable(),
  sellBuyRatio: nullableNumber,
  sheetWidth: nullableNumber,
  sheetHeight: nullableNumber,
  sheetCost: nullableNumber,
  partNumber: nullableString,
  weight: nullableNumber,
  weightUom: z.nativeEnum(MaterialWeightUom).optional().nullable(),
  cost: nullableNumber,
  price: nullableNumber,
  multiplier: nullableNumber,
  setupCharge: nullableNumber,
  laborCharge: nullableNumber,
  machineCharge: nullableNumber,
  otherCharge: nullableNumber,
  formula: z.nativeEnum(MaterialFormulaType).optional().nullable(),
  discountId: nullableString,
  includeInBasePrice: z.boolean().default(false),
  quickbooksItemType: z.nativeEnum(QuickbooksItemType).optional().nullable(),
  cogAccountId: nullableString,
  perLiUnit: z.boolean().default(false),
  fixedSide: z.nativeEnum(MaterialFixedSide).optional().nullable(),
  wastageMarkup: nullableNumber,
  calculateWastage: z.boolean().default(false),
  notes: nullableString,
});

function clean<T extends Record<string, unknown>>(payload: T): T {
  return Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, v === '' ? null : v])) as T;
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.material.findFirst({ where: withCompany(companyId, { id, active: true }) });
  if (!existing) return NextResponse.json({ error: 'Material not found' }, { status: 404 });

  const parsed = schema.safeParse(clean(await req.json().catch(() => ({}))));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid material payload' }, { status: 400 });

  const updated = await prisma.material.update({
    where: { id },
    data: parsed.data,
    include: { materialType: true, materialCategory: true, discount: true, cogAccount: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.material.findFirst({ where: withCompany(companyId, { id, active: true }) });
  if (!existing) return NextResponse.json({ error: 'Material not found' }, { status: 404 });

  await prisma.material.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
