import { prisma } from '@/lib/prisma';
import { ensureUserCompanyContext } from '@/lib/company-context';
import { getEffectivePermissions } from '@/lib/rbac';

export type HydratedAuthUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role: string;
  roles: string[];
  permissions: string[];
  companyId: string;
  companies: Array<{ id: string; name: string; slug: string }>;
};

export async function buildAuthUser(userId: string): Promise<HydratedAuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      customRoles: {
        include: { role: true },
      },
    },
  });

  if (!user || !user.active) return null;

  const context = await ensureUserCompanyContext(user.id);
  if (!context?.activeCompanyId) return null;

  const scopedCustomRoles = user.customRoles.filter((entry) => !entry.role.companyId || entry.role.companyId === context.activeCompanyId);
  const customRoleNames = scopedCustomRoles.map((entry) => entry.role.name);
  const permissions = getEffectivePermissions(
    user.type,
    scopedCustomRoles.map((entry) => entry.role.permissions)
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.avatarUrl,
    role: user.type,
    roles: [user.type, ...customRoleNames],
    permissions,
    companyId: context.activeCompanyId,
    companies: context.companies,
  };
}
