import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

const ALLOWED_TYPES: UserType[] = ['ADMIN', 'SALES', 'SALES_REP', 'PROJECT_MANAGER', 'DESIGNER', 'OPERATIONS', 'PURCHASING', 'FINANCE'];

export async function GET() {
  const auth = await requireRoles(['ADMIN']);
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
      customRoleId: true,
      customRole: { select: { name: true } },
    },
  });

  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const name = String(body?.name || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  const type = String(body?.type || 'SALES') as UserType;
  const customRoleId = body?.customRoleId ? String(body.customRoleId) : null;

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'name, email, and password are required' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: 'invalid user type' }, { status: 400 });
  }

  const passwordHash = await hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        type,
        customRoleId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        active: true,
        createdAt: true,
        customRoleId: true,
        customRole: { select: { name: true } },
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'email already exists' }, { status: 409 });
  }
}
