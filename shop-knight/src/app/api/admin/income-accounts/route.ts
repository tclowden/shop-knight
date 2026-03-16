import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';
import { ensureProductAdminSchema } from '@/lib/product-admin-schema';

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const items = await prisma.incomeAccount.findMany({ where: withCompany(companyId), orderBy: [{ code: 'asc' }, { name: 'asc' }] });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  await ensureProductAdminSchema();

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || '').trim();
  const name = String(body?.name || '').trim();
  if (!code || !name) return NextResponse.json({ error: 'code and name required' }, { status: 400 });

  try {
    const created = await prisma.incomeAccount.create({
      data: {
        companyId,
        code,
        name,
        description: body?.description ? String(body.description) : null,
        active: body?.active === undefined ? true : Boolean(body.active),
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Income account already exists or could not be created' }, { status: 409 });
  }
}
