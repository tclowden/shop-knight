import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PricingFormulaType, PricingRatePer, PricingRateUnit } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

const schema = z.object({
  name: z.string().trim().min(1),
  cost: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
  markup: z.coerce.number().min(0),
  units: z.nativeEnum(PricingRatePer),
  setupCharge: z.coerce.number().min(0),
  laborCharge: z.coerce.number().min(0),
  otherCharge: z.coerce.number().min(0),
  formula: z.nativeEnum(PricingFormulaType),
  productionRate: z.coerce.number().min(0),
  rateUnit: z.nativeEnum(PricingRateUnit),
  per: z.nativeEnum(PricingRatePer),
});

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const items = await prisma.machineRate.findMany({
    where: withCompany(companyId, { active: true }),
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid machine rate payload' }, { status: 400 });
  }

  try {
    const created = await prisma.machineRate.create({
      data: {
        companyId,
        ...parsed.data,
        name: parsed.data.name.trim(),
        units: parsed.data.units,
        active: true,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Machine rate already exists or could not be created' }, { status: 409 });
  }
}
