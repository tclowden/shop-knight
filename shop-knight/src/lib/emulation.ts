import { UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { buildAuthUser } from '@/lib/auth-context';

export type ActorContext = {
  actorId: string;
  actorRole: string;
  actorCompanyId: string | null;
};

function isSuperAdmin(role: string) {
  return role === 'SUPER_ADMIN';
}

function isAdmin(role: string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export async function getEffectiveUserForActor(actorId: string) {
  const session = await prisma.userEmulationSession.findUnique({
    where: { actorId },
    select: { targetUserId: true },
  });

  if (!session?.targetUserId) {
    return { effectiveUser: await buildAuthUser(actorId), emulationTargetUserId: null };
  }

  const effectiveUser = await buildAuthUser(session.targetUserId);
  if (!effectiveUser) {
    await prisma.userEmulationSession.delete({ where: { actorId } }).catch(() => null);
    return { effectiveUser: await buildAuthUser(actorId), emulationTargetUserId: null };
  }

  return { effectiveUser, emulationTargetUserId: session.targetUserId };
}

export async function startEmulation(input: { actorId: string; actorRole: string; actorCompanyId: string | null; targetUserId: string }) {
  const { actorId, actorRole, actorCompanyId, targetUserId } = input;
  if (!isAdmin(actorRole)) return { ok: false as const, status: 403, error: 'Only ADMIN or SUPER_ADMIN can emulate users.' };
  if (actorId === targetUserId) return { ok: false as const, status: 400, error: 'You cannot emulate yourself.' };

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, active: true, type: true, activeCompanyId: true },
  });

  if (!target || !target.active) return { ok: false as const, status: 404, error: 'Target user not found or inactive.' };

  if (!isSuperAdmin(actorRole)) {
    if (target.type === 'SUPER_ADMIN') {
      return { ok: false as const, status: 403, error: 'ADMIN cannot emulate SUPER_ADMIN users.' };
    }
    if (!actorCompanyId || !target.activeCompanyId || target.activeCompanyId !== actorCompanyId) {
      return { ok: false as const, status: 403, error: 'ADMIN can only emulate users in the same company.' };
    }
  }

  await prisma.$transaction([
    prisma.userEmulationSession.upsert({
      where: { actorId },
      create: { actorId, targetUserId },
      update: { targetUserId },
    }),
    prisma.userEmulationAudit.create({
      data: {
        actorId,
        targetUserId,
        action: 'START',
        actorRole: actorRole as UserType,
        actorCompanyId: actorCompanyId || null,
      },
    }),
  ]);

  return { ok: true as const };
}

export async function stopEmulation(input: ActorContext) {
  const existing = await prisma.userEmulationSession.findUnique({
    where: { actorId: input.actorId },
    select: { targetUserId: true },
  });

  if (!existing) return { ok: true as const, stopped: false };

  await prisma.$transaction([
    prisma.userEmulationSession.delete({ where: { actorId: input.actorId } }),
    prisma.userEmulationAudit.create({
      data: {
        actorId: input.actorId,
        targetUserId: existing.targetUserId,
        action: 'STOP',
        actorRole: input.actorRole as UserType,
        actorCompanyId: input.actorCompanyId || null,
      },
    }),
  ]);

  return { ok: true as const, stopped: true };
}
