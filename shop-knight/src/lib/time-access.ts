import { prisma } from '@/lib/prisma';

export async function getManagedUserIds(companyId: string, managerUserId: string) {
  const users = await prisma.user.findMany({
    where: { activeCompanyId: companyId, isEmployee: true, active: true },
    select: { id: true, reportsToId: true },
  });

  const children = new Map<string, string[]>();
  for (const user of users) {
    if (!user.reportsToId) continue;
    const arr = children.get(user.reportsToId) || [];
    arr.push(user.id);
    children.set(user.reportsToId, arr);
  }

  const managed = new Set<string>();
  const queue = [...(children.get(managerUserId) || [])];
  while (queue.length > 0) {
    const next = queue.shift()!;
    if (managed.has(next)) continue;
    managed.add(next);
    queue.push(...(children.get(next) || []));
  }

  return [...managed];
}

export function canManageAll(permissions: string[]) {
  return permissions.includes('time.manage.all');
}

export function canManageTeam(permissions: string[]) {
  return permissions.includes('time.manage.team') || canManageAll(permissions);
}

export async function getPayPeriodLock(companyId: string, at: Date) {
  return prisma.payPeriodLock.findFirst({
    where: {
      companyId,
      startDate: { lte: at },
      endDate: { gte: at },
    },
  });
}
