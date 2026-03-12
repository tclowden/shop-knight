import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions } from '@/lib/api-auth';

async function authorizeTitles() {
  const primary = await requirePermissions(['admin.titles.manage']);
  if (primary.ok) return primary;
  const fallback = await requirePermissions(['admin.users.manage']);
  if (fallback.ok) return fallback;
  return primary;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeTitles();
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const name = body?.name === undefined ? undefined : String(body.name || '').trim();
  if (name !== undefined && !name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  try {
    const existing = await prisma.title.findFirst({ where: { id, companyId } });
    if (!existing) {
      return NextResponse.json({ error: 'Title not found' }, { status: 404 });
    }

    const updated = await prisma.title.update({
      where: { id },
      data: {
        name,
        active: body?.active === undefined ? undefined : Boolean(body.active),
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Unable to update title' }, { status: 400 });
  }
}
