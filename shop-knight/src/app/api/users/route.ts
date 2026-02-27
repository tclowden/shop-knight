import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true, type: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(users);
}
