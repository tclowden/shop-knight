import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.incomeAccount.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Income account not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const code = body?.code !== undefined ? String(body.code || '').trim() : undefined;
  const name = body?.name !== undefined ? String(body.name || '').trim() : undefined;

  if (code !== undefined && !code) return NextResponse.json({ error: 'code required' }, { status: 400 });
  if (name !== undefined && !name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const updated = await prisma.incomeAccount.update({
    where: { id },
    data: {
      code,
      name,
      description: body?.description !== undefined ? String(body.description || '') : undefined,
      active: body?.active !== undefined ? Boolean(body.active) : undefined,
    },
  });

  return NextResponse.json(updated);
}
