import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions } from '@/lib/api-auth';

type OrgNode = {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string | null;
  reportsToId: string | null;
  division: string;
};

export async function GET() {
  const auth = await requirePermissions(['admin.users.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) {
    return NextResponse.json({ error: 'No active company selected' }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } });
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

  const users = await prisma.user.findMany({
    where: { active: true, activeCompanyId: companyId, isEmployee: true },
    orderBy: [{ name: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      reportsToId: true,
      title: { select: { name: true } },
      department: { select: { name: true } },
    },
  });

  const nodes: OrgNode[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    title: user.title?.name || 'No title',
    reportsToId: user.reportsToId,
    division: user.department?.name || 'Unassigned',
  }));

  const hasReports = new Set<string>();
  for (const node of nodes) {
    if (node.reportsToId) hasReports.add(node.reportsToId);
  }

  const filteredNodes = nodes.filter((node) => {
    const unassignedDivision = node.division === 'Unassigned';
    const isolated = !node.reportsToId && !hasReports.has(node.id);
    return !(unassignedDivision && isolated);
  });

  return NextResponse.json({ company, nodes: filteredNodes });
}
