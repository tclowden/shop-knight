import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermissions } from '@/lib/api-auth';

function normalizeRoleIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const values = input
    .map((value) => String(value).trim())
    .filter((value): value is string => value.length > 0);
  return [...new Set(values)];
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissions(['admin.users.manage']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const customRoleIds = body?.customRoleIds === undefined ? undefined : normalizeRoleIds(body.customRoleIds);

  const updated = await prisma.user.update({
    where: { id },
    data: {
      active: body?.active !== undefined ? Boolean(body.active) : undefined,
      customRoles: customRoleIds
        ? {
            deleteMany: {},
            create: customRoleIds.map((roleId) => ({ roleId })),
          }
        : undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      active: true,
      customRoles: {
        select: {
          roleId: true,
          role: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(updated);
}
