import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermissions } from '@/lib/api-auth';
import { sanitizePermissions } from '@/lib/rbac';

export async function GET() {
  const auth = await requirePermissions(['admin.customRoles.manage']);
  if (!auth.ok) return auth.response;

  const roles = await prisma.customRole.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(roles);
}

export async function POST(req: Request) {
  const auth = await requirePermissions(['admin.customRoles.manage']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const name = String(body?.name || '').trim();
  const permissions = sanitizePermissions(body?.permissions);
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  try {
    const role = await prisma.customRole.create({ data: { name, active: true, permissions } });
    return NextResponse.json(role, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'role already exists' }, { status: 409 });
  }
}
