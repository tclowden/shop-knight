import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

const updateSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  isDefault: z.coerce.boolean().optional().default(false),
});

const toggleSchema = z.object({
  active: z.boolean(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.pricingProfile.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Pricing profile not found' }, { status: 404 });

  const payload = await req.json().catch(() => ({}));

  const toggleParsed = toggleSchema.safeParse(payload);
  if (toggleParsed.success) {
    const nextActive = toggleParsed.data.active;
    const updated = await prisma.$transaction(async (tx) => {
      if (!nextActive && existing.isDefault) {
        await tx.pricingProfile.update({ where: { id }, data: { active: false, isDefault: false } });
        const replacement = await tx.pricingProfile.findFirst({
          where: withCompany(companyId, { active: true, id: { not: id } }),
          orderBy: { name: 'asc' },
          select: { id: true },
        });
        if (replacement) {
          await tx.pricingProfile.update({ where: { id: replacement.id }, data: { isDefault: true } });
        }
      } else if (nextActive && payload.isDefault === true) {
        await tx.pricingProfile.updateMany({
          where: withCompany(companyId, { active: true, isDefault: true, id: { not: id } }),
          data: { isDefault: false },
        });
        await tx.pricingProfile.update({ where: { id }, data: { active: true, isDefault: true } });
      } else {
        await tx.pricingProfile.update({
          where: { id },
          data: {
            active: nextActive,
            ...(nextActive ? {} : { isDefault: false }),
          },
        });
      }

      return tx.pricingProfile.findUnique({ where: { id } });
    });

    return NextResponse.json(updated);
  }

  if (!existing.active) {
    return NextResponse.json({ error: 'Archived pricing profile must be restored before editing' }, { status: 409 });
  }

  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid pricing profile payload' }, { status: 400 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault) {
        await tx.pricingProfile.updateMany({
          where: withCompany(companyId, { active: true, isDefault: true, id: { not: id } }),
          data: { isDefault: false },
        });
      }

      return tx.pricingProfile.update({
        where: { id },
        data: {
          name: parsed.data.name.trim(),
          description: parsed.data.description?.trim() || null,
          isDefault: parsed.data.isDefault,
        },
      });
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Pricing profile already exists or could not be updated' }, { status: 409 });
  }
}
