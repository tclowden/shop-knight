import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  try {
    const items = await prisma.productCategory.findMany({ where: withCompany(companyId), orderBy: { name: 'asc' } });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to load product categories. Database may be missing recent migrations.',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  try {
    const existingItems = await prisma.productCategory.findMany({
      where: { companyId },
      select: { id: true, name: true, active: true },
    });
    const existing = existingItems.find((c) => c.name.trim().toLowerCase() === name.toLowerCase());

    if (existing) {
      return NextResponse.json(
        {
          error: existing.active
            ? `Category "${existing.name}" already exists.`
            : `Category "${existing.name}" already exists but is inactive. Re-enable it instead of creating a duplicate.`,
        },
        { status: 409 }
      );
    }

    const created = await prisma.productCategory.create({
      data: { companyId, name, active: body?.active === undefined ? true : Boolean(body.active) },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to create category. Database may be missing recent migrations.',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
