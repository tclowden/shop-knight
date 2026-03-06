import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { BASE_ROLE_DEFAULTS } from '@/lib/rbac';

export async function requireRoles(roles: string[]) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const allRoles = (session?.user as { roles?: string[] } | undefined)?.roles ?? (role ? [role] : []);

  if (!session?.user) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const userPermissions = (session?.user as { permissions?: string[] } | undefined)?.permissions ?? [];
  const directRoleMatch = allRoles.some((item) => roles.includes(item));
  const permissionEquivalentMatch = roles.some((roleName) => {
    const defaults = BASE_ROLE_DEFAULTS[roleName] ?? [];
    if (defaults.length === 0) return false;
    return defaults.every((permission) => userPermissions.includes(permission));
  });

  if (!directRoleMatch && !permissionEquivalentMatch) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true as const, session };
}

export async function requirePermissions(permissions: string[]) {
  const session = await getServerSession(authOptions);
  const userPermissions = (session?.user as { permissions?: string[] } | undefined)?.permissions ?? [];

  if (!session?.user) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!permissions.every((permission) => userPermissions.includes(permission))) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true as const, session };
}

export function getSessionCompanyId(session: { user?: { companyId?: string } } | null | undefined) {
  const companyId = session?.user?.companyId;
  return companyId ? String(companyId) : null;
}

export function withCompany<T extends Record<string, unknown>>(companyId: string, where?: T): T & { companyId: string } {
  return { ...(where || ({} as T)), companyId };
}
