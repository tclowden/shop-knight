import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

const schema = z.object({
  materialTypeId: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

export async function GET(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const url = new URL(req.url);
  const materialTypeId = url.searchParams.get('materialTypeId');

  const items = await prisma.materialCategory.findMany({
    where: withCompany(companyId, {
      active: true,
      ...(materialTypeId ? { materialTypeId } : {}),
    }),
    include: { materialType: true },
    orderBy: [{ materialType: { name: 'asc' } }, { name: 'asc' }],
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid material category payload' }, { status: 400 });

  const typeExists = await prisma.materialType.findFirst({ where: withCompany(companyId, { id: parsed.data.materialTypeId, active: true }) });
  if (!typeExists) return NextResponse.json({ error: 'Material type not found' }, { status: 404 });

  try {
    const created = await prisma.materialCategory.create({
      data: {
        companyId,
        materialTypeId: parsed.data.materialTypeId,
        name: parsed.data.name,
        active: true,
      },
      include: { materialType: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Material category already exists or could not be created' }, { status: 409 });
  }
}
