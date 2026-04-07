import { NextResponse } from 'next/server';
import { Prisma, PricingComponentType, PricingFormulaType, PricingRatePer, PricingRateUnit, PricingValueType } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

const nullableString = z.string().trim().min(1).optional().nullable();

const schema = z.object({
  profileId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  componentType: z.nativeEnum(PricingComponentType),
  valueType: z.nativeEnum(PricingValueType),
  formulaType: z.nativeEnum(PricingFormulaType).optional().nullable(),
  rateUnit: z.nativeEnum(PricingRateUnit).optional().nullable(),
  ratePer: z.nativeEnum(PricingRatePer).optional().nullable(),
  amount: z.coerce.number().min(0),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
  metadata: z.unknown().optional().nullable(),
});

export async function GET(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const url = new URL(req.url);
  const archived = url.searchParams.get('archived') || 'active';
  const profileId = nullableString.safeParse(url.searchParams.get('profileId')).success
    ? (url.searchParams.get('profileId')?.trim() || null)
    : null;

  const where = archived === 'all'
    ? withCompany(companyId, profileId ? { profileId } : undefined)
    : withCompany(companyId, {
      ...(profileId ? { profileId } : {}),
      active: archived === 'archived' ? false : true,
    });

  const [items, profiles] = await Promise.all([
    prisma.pricingProfileComponent.findMany({
      where,
      include: {
        profile: {
          select: { id: true, name: true, active: true },
        },
      },
      orderBy: [{ profile: { name: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.pricingProfile.findMany({
      where: withCompany(companyId, { active: true }),
      orderBy: { name: 'asc' },
      select: { id: true, name: true, isDefault: true },
    }),
  ]);

  return NextResponse.json({ items, profiles });
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid pricing profile component payload' }, { status: 400 });
  }

  const profile = await prisma.pricingProfile.findFirst({
    where: withCompany(companyId, { id: parsed.data.profileId, active: true }),
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: 'Pricing profile not found' }, { status: 400 });
  }

  const created = await prisma.pricingProfileComponent.create({
    data: {
      companyId,
      profileId: parsed.data.profileId,
      name: parsed.data.name.trim(),
      componentType: parsed.data.componentType,
      valueType: parsed.data.valueType,
      formulaType: parsed.data.formulaType ?? null,
      rateUnit: parsed.data.rateUnit ?? null,
      ratePer: parsed.data.ratePer ?? null,
      amount: parsed.data.amount,
      sortOrder: parsed.data.sortOrder,
      metadata: parsed.data.metadata ?? Prisma.JsonNull,
      active: true,
    },
    include: {
      profile: {
        select: { id: true, name: true, active: true },
      },
    },
  });

  return NextResponse.json(created, { status: 201 });
}
