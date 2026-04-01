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

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const items = await prisma.material.findMany({
    where: withCompany(companyId, { active: true }),
    include: {
      materialType: true,
      materialCategory: true,
      discount: true,
      cogAccount: true,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const parsed = schema.safeParse(clean(await req.json().catch(() => ({}))));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid material payload' }, { status: 400 });

  try {
    const created = await prisma.material.create({
      data: { companyId, ...parsed.data, active: true },
      include: {
        materialType: true,
        materialCategory: true,
        discount: true,
        cogAccount: true,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Material already exists or could not be created' }, { status: 409 });
  }
}
