import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const users = await prisma.user.findMany({
    where: {
      active: true,
      companyMemberships: { some: withCompany(companyId) },
    },
    select: { id: true, name: true, email: true, type: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(users);
}
