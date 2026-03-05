import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.user.update({
    where: { id },
    data: {
      customRoleId: body?.customRoleId !== undefined ? (body.customRoleId ? String(body.customRoleId) : null) : undefined,
      active: body?.active !== undefined ? Boolean(body.active) : undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      active: true,
      customRoleId: true,
      customRole: { select: { name: true } },
    },
  });

  return NextResponse.json(updated);
}
