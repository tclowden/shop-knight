import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles } from '@/lib/api-auth';

function computeEffectiveMinutes(clockInAt: Date, clockOutAt: Date | null, minutesWorked: number | null) {
  if (typeof minutesWorked === 'number' && Number.isFinite(minutesWorked)) return Math.max(0, minutesWorked);
  const end = clockOutAt ?? new Date();
  return Math.max(0, Math.round((end.getTime() - clockInAt.getTime()) / 60000));
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'SALES', 'OPERATIONS', 'PURCHASING', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const salesOrder = await prisma.salesOrder.findFirst({
    where: { id, companyId },
    select: { id: true, projectManagerId: true },
  });

  if (!salesOrder) return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });

  const sessionUserId = String(auth.session.user.id || '');
  const roles = auth.session.user.roles || (auth.session.user.role ? [auth.session.user.role] : []);
  const isAdmin = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');
  const isAssignedProjectManager = Boolean(salesOrder.projectManagerId && salesOrder.projectManagerId === sessionUserId);

  if (!isAdmin && !isAssignedProjectManager) {
    return NextResponse.json({ error: 'Only the assigned project manager can view this hours summary' }, { status: 403 });
  }

  const entries = await prisma.timeEntry.findMany({
    where: { companyId, salesOrderId: salesOrder.id },
    orderBy: { clockInAt: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
    },
    take: 500,
  });

  const normalized = entries.map((entry) => {
    const effectiveMinutes = computeEffectiveMinutes(entry.clockInAt, entry.clockOutAt, entry.minutesWorked);
    return {
      id: entry.id,
      userId: entry.userId,
      userName: entry.user?.name || 'Unknown User',
      clockInAt: entry.clockInAt,
      clockOutAt: entry.clockOutAt,
      minutesWorked: effectiveMinutes,
      status: entry.status,
      notes: entry.notes,
    };
  });

  const totalMinutes = normalized.reduce((sum, row) => sum + row.minutesWorked, 0);

  return NextResponse.json({
    totalMinutes,
    entries: normalized,
  });
}
