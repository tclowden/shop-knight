import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);

  const templates = await prisma.jobWorkflowTemplate.findMany({
    where: companyId ? withCompany(companyId, { active: true }) : { companyId: null, active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(templates);
}
