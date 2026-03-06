import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
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

export async function GET() {
  const auth = await requirePermissions(['admin.users.manage']);
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      active: true,
      createdAt: true,
      customRoles: {
        select: {
          roleId: true,
          role: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const auth = await requirePermissions(['admin.users.manage']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const name = String(body?.name || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  const type = String(body?.type || 'SALES') as UserTypeValue;
  const customRoleIds = normalizeRoleIds(body?.customRoleIds);
  const companyId = String(body?.companyId || '').trim();

  if (!name || !email || !password || !companyId) {
    return NextResponse.json({ error: 'name, email, password, and company are required' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: 'invalid user type' }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!company) {
    return NextResponse.json({ error: 'invalid company' }, { status: 400 });
  }

  const passwordHash = await hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        type,
        active: true,
        activeCompanyId: companyId,
        companyMemberships: {
          create: [{ companyId }],
        },
        customRoles: {
          create: customRoleIds.map((roleId) => ({ roleId })),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        active: true,
        createdAt: true,
        customRoles: {
          select: {
            roleId: true,
            role: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'unable to create user (email may already exist)' }, { status: 409 });
  }
}
