import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManageAll, canManageTeam, getManagedUserIds, getPayPeriodLock } from '@/lib/time-access';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = session.user.companyId;
  if (!companyId) return NextResponse.json({ error: 'No active company selected' }, { status: 400 });

  const { id } = await params;
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.companyId !== companyId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const permissions = session.user.permissions || [];
  const manageAll = canManageAll(permissions);
  const manageTeam = canManageTeam(permissions);
  const managedIds = manageTeam ? await getManagedUserIds(companyId, session.user.id) : [];
  const canManageEntry = manageAll || managedIds.includes(entry.userId);
  const isOwn = entry.userId === session.user.id;

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  const overrideLock = Boolean(body?.overrideLock);

  const periodLock = await getPayPeriodLock(companyId, entry.clockInAt);
  if (periodLock && !(overrideLock && manageAll)) {
    return NextResponse.json({ error: 'This pay period is locked. HR override required.' }, { status: 423 });
  }

  if (typeof body.clockInAt === 'string' && (isOwn || canManageEntry)) patch.clockInAt = new Date(body.clockInAt);
  if (typeof body.clockOutAt === 'string' && (isOwn || canManageEntry)) patch.clockOutAt = new Date(body.clockOutAt);
  if (typeof body.notes === 'string' && (isOwn || canManageEntry)) patch.notes = body.notes;

  if (patch.clockInAt || patch.clockOutAt) {
    const start = (patch.clockInAt as Date | undefined) || entry.clockInAt;
    const end = (patch.clockOutAt as Date | undefined) || entry.clockOutAt;
    if (end) patch.minutesWorked = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    patch.status = 'PENDING';
    patch.lastEditedAt = new Date();
    patch.lastEditedById = session.user.id;
  }

  if (typeof body.status === 'string' && ['PENDING', 'APPROVED', 'REJECTED'].includes(body.status) && canManageEntry) {
    patch.status = body.status;
    patch.approvedAt = body.status === 'APPROVED' ? new Date() : null;
    patch.approvedById = body.status === 'APPROVED' ? session.user.id : null;
    patch.approvalNote = typeof body.approvalNote === 'string' ? body.approvalNote : null;
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No permitted changes' }, { status: 400 });

  const updated = await prisma.timeEntry.update({ where: { id }, data: patch as never });
  return NextResponse.json(updated);
}
