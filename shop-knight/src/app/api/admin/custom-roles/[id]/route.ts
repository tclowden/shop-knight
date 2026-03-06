import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions } from '@/lib/api-auth';
import { sanitizePermissions } from '@/lib/rbac';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissions(['admin.customRoles.manage']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();

  const data: {
    name?: string;
    active?: boolean;
    permissions?: string[];
  } = {};

  if (body?.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    data.name = name;
  }

  if (body?.active !== undefined) {
    data.active = Boolean(body.active);
  }

  if (body?.permissions !== undefined) {
    data.permissions = sanitizePermissions(body.permissions);
  }

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const existing = await prisma.customRole.findFirst({ where: { id, companyId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const updated = await prisma.customRole.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'failed to update role' }, { status: 400 });
  }
}
