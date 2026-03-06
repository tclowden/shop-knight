import { prisma } from '@/lib/prisma';

export async function ensureUserCompanyContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      activeCompanyId: true,
      companyMemberships: {
        select: {
          companyId: true,
          company: { select: { id: true, name: true, slug: true, active: true } },
        },
      },
    },
  });

  if (!user) return null;
  const memberships = user.companyMemberships.filter((m) => m.company.active);
  let activeCompanyId = user.activeCompanyId;

  if (!activeCompanyId || !memberships.some((m) => m.companyId === activeCompanyId)) {
    activeCompanyId = memberships[0]?.companyId ?? null;
    if (activeCompanyId) {
      await prisma.user.update({ where: { id: userId }, data: { activeCompanyId } });
    }
  }

  return {
    activeCompanyId,
    companies: memberships.map((m) => ({ id: m.company.id, name: m.company.name, slug: m.company.slug })),
  };
}
