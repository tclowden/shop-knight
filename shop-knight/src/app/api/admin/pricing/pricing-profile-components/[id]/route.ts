import { NextResponse } from 'next/server';
import { Prisma, PricingComponentType, PricingFormulaType, PricingRatePer, PricingRateUnit, PricingValueType } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

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

const restoreSchema = z.object({ active: z.literal(true) });

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.pricingProfileComponent.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Pricing profile component not found' }, { status: 404 });

  const payload = await req.json().catch(() => ({}));

  const restoreParsed = restoreSchema.safeParse(payload);
  if (restoreParsed.success) {
    const restored = await prisma.pricingProfileComponent.update({
      where: { id },
      data: { active: true },
      include: { profile: { select: { id: true, name: true, active: true } } },
    });
    return NextResponse.json(restored);
  }

  if (!existing.active) {
    return NextResponse.json({ error: 'Archived pricing profile component must be restored before editing' }, { status: 409 });
  }

  const parsed = schema.safeParse(payload);
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

  const updated = await prisma.pricingProfileComponent.update({
    where: { id },
    data: {
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
    },
    include: {
      profile: {
        select: { id: true, name: true, active: true },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.pricingProfileComponent.findFirst({ where: withCompany(companyId, { id, active: true }) });
  if (!existing) return NextResponse.json({ error: 'Pricing profile component not found' }, { status: 404 });

  await prisma.pricingProfileComponent.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
