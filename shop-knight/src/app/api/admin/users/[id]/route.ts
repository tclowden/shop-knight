import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermissions } from '@/lib/api-auth';

const ALLOWED_TYPES = ['ADMIN', 'SALES', 'SALES_REP', 'PROJECT_MANAGER', 'DESIGNER', 'OPERATIONS', 'PURCHASING', 'FINANCE'] as const;
type UserTypeValue = (typeof ALLOWED_TYPES)[number];

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
  const type = body?.type === undefined ? undefined : (String(body.type) as UserTypeValue);

  if (type !== undefined && !ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: 'invalid user type' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      type,
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
