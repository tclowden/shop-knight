import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

const createSchema = z.object({
  productId: z.string().trim().min(1),
  profileId: z.string().trim().min(1),
  isDefault: z.coerce.boolean().optional(),
});

const updateSchema = z.object({
  assignmentId: z.string().trim().min(1),
  profileId: z.string().trim().min(1).optional(),
  isDefault: z.coerce.boolean().optional(),
});

async function ensureCompanyEntities(companyId: string, productId: string, profileId: string) {
  const [product, profile] = await Promise.all([
    prisma.product.findFirst({
      where: withCompany(companyId, { id: productId, active: true }),
      select: { id: true, name: true },
    }),
    prisma.pricingProfile.findFirst({
      where: withCompany(companyId, { id: profileId, active: true }),
      select: { id: true, name: true },
    }),
  ]);

  return { product, profile };
}

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const [assignments, products, profiles] = await Promise.all([
    prisma.productPricingProfile.findMany({
      where: withCompany(companyId),
      include: {
        product: {
          select: { id: true, name: true, sku: true, active: true },
        },
        profile: {
          select: { id: true, name: true, active: true, isDefault: true },
        },
      },
      orderBy: [{ product: { name: 'asc' } }, { isDefault: 'desc' }, { profile: { name: 'asc' } }],
    }),
    prisma.product.findMany({
      where: withCompany(companyId, { active: true }),
      orderBy: { name: 'asc' },
      select: { id: true, name: true, sku: true },
    }),
    prisma.pricingProfile.findMany({
      where: withCompany(companyId, { active: true }),
      orderBy: { name: 'asc' },
      select: { id: true, name: true, isDefault: true },
    }),
  ]);

  return NextResponse.json({ assignments, products, profiles });
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid product pricing profile payload' }, { status: 400 });
  }

  const { product, profile } = await ensureCompanyEntities(companyId, parsed.data.productId, parsed.data.profileId);
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 400 });
  if (!profile) return NextResponse.json({ error: 'Pricing profile not found' }, { status: 400 });

  try {
    const created = await prisma.$transaction(async (tx) => {
      const existingAssignments = await tx.productPricingProfile.findMany({
        where: withCompany(companyId, { productId: parsed.data.productId }),
        select: { id: true },
      });
      const isDefault = parsed.data.isDefault ?? existingAssignments.length === 0;

      if (isDefault) {
        await tx.productPricingProfile.updateMany({
          where: withCompany(companyId, { productId: parsed.data.productId, isDefault: true }),
          data: { isDefault: false },
        });
      }

      return tx.productPricingProfile.create({
        data: {
          companyId,
          productId: parsed.data.productId,
          profileId: parsed.data.profileId,
          isDefault,
        },
        include: {
          product: { select: { id: true, name: true, sku: true, active: true } },
          profile: { select: { id: true, name: true, active: true, isDefault: true } },
        },
      });
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Product pricing profile already exists or could not be created' }, { status: 409 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid product pricing profile payload' }, { status: 400 });
  }

  const existing = await prisma.productPricingProfile.findFirst({
    where: withCompany(companyId, { id: parsed.data.assignmentId }),
    select: { id: true, productId: true, profileId: true },
  });
  if (!existing) return NextResponse.json({ error: 'Product pricing profile assignment not found' }, { status: 404 });

  const nextProfileId = parsed.data.profileId ?? existing.profileId;
  const { product, profile } = await ensureCompanyEntities(companyId, existing.productId, nextProfileId);
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 400 });
  if (!profile) return NextResponse.json({ error: 'Pricing profile not found' }, { status: 400 });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault === true) {
        await tx.productPricingProfile.updateMany({
          where: withCompany(companyId, { productId: existing.productId, isDefault: true, id: { not: existing.id } }),
          data: { isDefault: false },
        });
      }

      const assignment = await tx.productPricingProfile.update({
        where: { id: existing.id },
        data: {
          profileId: nextProfileId,
          ...(parsed.data.isDefault === undefined ? {} : { isDefault: parsed.data.isDefault }),
        },
        include: {
          product: { select: { id: true, name: true, sku: true, active: true } },
          profile: { select: { id: true, name: true, active: true, isDefault: true } },
        },
      });

      const defaults = await tx.productPricingProfile.count({
        where: withCompany(companyId, { productId: existing.productId, isDefault: true }),
      });
      if (defaults === 0) {
        await tx.productPricingProfile.update({
          where: { id: existing.id },
          data: { isDefault: true },
        });
        assignment.isDefault = true;
      }

      return assignment;
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Product pricing profile could not be updated' }, { status: 409 });
  }
}
