import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermissions } from '@/lib/api-auth';

const ALLOWED_TYPES = ['SUPER_ADMIN', 'ADMIN', 'SALES', 'SALES_REP', 'PROJECT_MANAGER', 'DESIGNER', 'OPERATIONS', 'PURCHASING', 'FINANCE'] as const;
type UserTypeValue = (typeof ALLOWED_TYPES)[number];

function isSuperAdminSession(session: { user?: { role?: string; roles?: string[] } } | null | undefined) {
  const role = String(session?.user?.role || '');
  const roles = Array.isArray(session?.user?.roles) ? session.user.roles.map(String) : [];
  return role === 'SUPER_ADMIN' || roles.includes('SUPER_ADMIN');
}

function normalizeRoleIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const values = input
    .map((value) => String(value).trim())
    .filter((value): value is string => value.length > 0);
  return [...new Set(values)];
}

function normalizeCompanyIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const values = input
    .map((value) => String(value).trim())
    .filter((value): value is string => value.length > 0);
  return [...new Set(values)];
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissions(['admin.users.manage']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const canAssignSuperAdmin = isSuperAdminSession(auth.session);

  const name = body?.name === undefined ? undefined : String(body.name || '').trim();
  const email = body?.email === undefined ? undefined : String(body.email || '').trim().toLowerCase();
  const customRoleIds = body?.customRoleIds === undefined ? undefined : normalizeRoleIds(body.customRoleIds);
  const companyIds = body?.companyIds === undefined ? undefined : normalizeCompanyIds(body.companyIds);
  const activeCompanyId = body?.activeCompanyId === undefined ? undefined : String(body.activeCompanyId || '').trim();
  const type = body?.type === undefined ? undefined : (String(body.type) as UserTypeValue);
  const phone = body?.phone === undefined ? undefined : (body.phone ? String(body.phone) : null);
  const knownTravelerNumber = body?.knownTravelerNumber === undefined ? undefined : (body.knownTravelerNumber ? String(body.knownTravelerNumber) : null);
  const rewardMarriottNumber = body?.rewardMarriottNumber === undefined ? undefined : (body.rewardMarriottNumber ? String(body.rewardMarriottNumber) : null);
  const rewardUnitedNumber = body?.rewardUnitedNumber === undefined ? undefined : (body.rewardUnitedNumber ? String(body.rewardUnitedNumber) : null);
  const rewardDeltaNumber = body?.rewardDeltaNumber === undefined ? undefined : (body.rewardDeltaNumber ? String(body.rewardDeltaNumber) : null);
  const rewardAmericanNumber = body?.rewardAmericanNumber === undefined ? undefined : (body.rewardAmericanNumber ? String(body.rewardAmericanNumber) : null);
  const departmentId = body?.departmentId === undefined ? undefined : (body.departmentId ? String(body.departmentId) : null);
  const titleId = body?.titleId === undefined ? undefined : (body.titleId ? String(body.titleId) : null);
  const reportsToId = body?.reportsToId === undefined ? undefined : (body.reportsToId ? String(body.reportsToId) : null);
  const isEmployee = body?.isEmployee === undefined ? undefined : Boolean(body.isEmployee);

  if (name !== undefined && !name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  if (email !== undefined && !email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  if (type !== undefined && !ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: 'invalid user type' }, { status: 400 });
  }
  if (type === 'SUPER_ADMIN' && !canAssignSuperAdmin) {
    return NextResponse.json({ error: 'Only Super Admin can assign Super Admin role' }, { status: 403 });
  }

  if (companyIds !== undefined && companyIds.length === 0) {
    return NextResponse.json({ error: 'at least one company is required' }, { status: 400 });
  }

  if (companyIds !== undefined) {
    const validCompanies = await prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true },
    });

    if (validCompanies.length !== companyIds.length) {
      return NextResponse.json({ error: 'one or more companies are invalid' }, { status: 400 });
    }
  }

  if (activeCompanyId !== undefined) {
    const ids = companyIds ?? (
      await prisma.userCompany.findMany({ where: { userId: id }, select: { companyId: true } })
    ).map((entry) => entry.companyId);

    if (!ids.includes(activeCompanyId)) {
      return NextResponse.json({ error: 'active company must be one of user memberships' }, { status: 400 });
    }
  }

  const contextCompanyId = activeCompanyId !== undefined
    ? activeCompanyId
    : (await prisma.user.findUnique({ where: { id }, select: { activeCompanyId: true } }))?.activeCompanyId ?? null;

  if (titleId !== undefined && titleId && contextCompanyId) {
    const title = await prisma.title.findFirst({ where: { id: titleId, companyId: contextCompanyId } });
    if (!title) {
      return NextResponse.json({ error: 'invalid title' }, { status: 400 });
    }
  }

  if (reportsToId !== undefined && reportsToId) {
    if (reportsToId === id) {
      return NextResponse.json({ error: 'user cannot report to themselves' }, { status: 400 });
    }

    const manager = await prisma.user.findUnique({ where: { id: reportsToId }, select: { id: true } });
    if (!manager) {
      return NextResponse.json({ error: 'invalid reportsTo user' }, { status: 400 });
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (companyIds !== undefined) {
        await tx.userCompany.deleteMany({ where: { userId: id } });
        await tx.userCompany.createMany({
          data: companyIds.map((companyId) => ({ userId: id, companyId })),
        });
      }

      const effectiveCompanyIds = companyIds ?? (
        await tx.userCompany.findMany({ where: { userId: id }, select: { companyId: true } })
      ).map((entry) => entry.companyId);

      const nextActiveCompanyId =
        activeCompanyId !== undefined
          ? activeCompanyId
          : companyIds !== undefined
            ? effectiveCompanyIds[0] ?? null
            : undefined;

      return tx.user.update({
        where: { id },
        data: {
          name,
          email,
          type,
          phone,
          knownTravelerNumber,
          rewardMarriottNumber,
          rewardUnitedNumber,
          rewardDeltaNumber,
          rewardAmericanNumber,
          active: body?.active !== undefined ? Boolean(body.active) : undefined,
          activeCompanyId: nextActiveCompanyId,
          departmentId,
          titleId,
          reportsToId,
          isEmployee,
          customRoles: customRoleIds
            ? {
                deleteMany: {},
                create: customRoleIds.map((roleId) => ({ roleId })),
              }
            : undefined,
        },
        select: {
          id: true,
          name: true,
          email: true,
          type: true,
          phone: true,
          knownTravelerNumber: true,
          rewardMarriottNumber: true,
          rewardUnitedNumber: true,
          rewardDeltaNumber: true,
          rewardAmericanNumber: true,
          active: true,
          activeCompanyId: true,
          departmentId: true,
          department: { select: { id: true, name: true } },
          titleId: true,
          title: { select: { id: true, name: true } },
          reportsToId: true,
          reportsTo: { select: { id: true, name: true } },
          isEmployee: true,
          companyMemberships: { select: { companyId: true } },
          customRoles: {
            select: {
              roleId: true,
              role: { select: { id: true, name: true } },
            },
          },
        },
      });
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'failed to update user' }, { status: 400 });
  }
}
