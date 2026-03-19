import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.productCategory.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = body?.name !== undefined ? String(body.name || '').trim() : undefined;
  if (name !== undefined && !name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const updated = await prisma.productCategory.update({
    where: { id },
    data: { name, active: body?.active !== undefined ? Boolean(body.active) : undefined },
  });

  return NextResponse.json(updated);
}
