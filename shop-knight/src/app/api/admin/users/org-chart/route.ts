import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions } from '@/lib/api-auth';

function roleLabel(type: string) {
  return type
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export async function GET() {
  const auth = await requirePermissions(['admin.users.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) {
    return NextResponse.json({ error: 'No active company selected' }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true },
  });

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const users = await prisma.user.findMany({
    where: { active: true, activeCompanyId: companyId },
    orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      department: { select: { id: true, name: true } },
      customRoles: {
        select: {
          role: {
            select: { name: true },
          },
        },
      },
    },
  });

  const grouped = new Map<string, { id: string; name: string; users: Array<{ id: string; name: string; email: string; title: string; customRoles: string[] }> }>();

  for (const user of users) {
    const deptId = user.department?.id ?? 'unassigned';
    const deptName = user.department?.name ?? 'Unassigned';
    if (!grouped.has(deptId)) {
      grouped.set(deptId, { id: deptId, name: deptName, users: [] });
    }

    grouped.get(deptId)?.users.push({
      id: user.id,
      name: user.name,
      email: user.email,
      title: roleLabel(user.type),
      customRoles: user.customRoles.map((entry) => entry.role.name),
    });
  }

  return NextResponse.json({
    company,
    departments: Array.from(grouped.values()),
  });
}
