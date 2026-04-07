import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

const schema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  isDefault: z.coerce.boolean().optional().default(false),
});

export async function GET(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const url = new URL(req.url);
  const archived = url.searchParams.get('archived') || 'active';
  const where = archived === 'all'
    ? withCompany(companyId)
    : withCompany(companyId, { active: archived === 'archived' ? false : true });

  const items = await prisma.pricingProfile.findMany({
    where,
    include: {
      _count: {
        select: {
          components: true,
          products: true,
        },
      },
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

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid pricing profile payload' }, { status: 400 });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault) {
        await tx.pricingProfile.updateMany({
          where: withCompany(companyId, { isDefault: true }),
          data: { isDefault: false },
        });
      }

      return tx.pricingProfile.create({
        data: {
          companyId,
          name: parsed.data.name.trim(),
          description: parsed.data.description?.trim() || null,
          isDefault: parsed.data.isDefault,
          active: true,
        },
      });
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Pricing profile already exists or could not be created' }, { status: 409 });
  }
}
