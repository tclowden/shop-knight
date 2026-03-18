import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManageAll, canManageTeam, getManagedUserIds } from '@/lib/time-access';

function csvEscape(v: unknown) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const companyId = session.user.companyId;
  if (!companyId) return new Response('No active company selected', { status: 400 });

  const url = new URL(request.url);
  const scope = url.searchParams.get('scope') || 'team';
  const status = url.searchParams.get('status') || '';
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const format = (url.searchParams.get('format') || 'standard').toLowerCase();

  const permissions = session.user.permissions || [];
  let userIds: string[] = [session.user.id];

  if (scope === 'all' && canManageAll(permissions)) {
    const all = await prisma.user.findMany({ where: { activeCompanyId: companyId }, select: { id: true } });
    userIds = all.map((u) => u.id);
  } else if (scope === 'team' && canManageTeam(permissions)) {
    userIds = await getManagedUserIds(companyId, session.user.id);
  }

  const rows = await prisma.timeEntry.findMany({
    where: {
      companyId,
      userId: { in: userIds },
      ...(status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {}),
      ...(from || to
        ? {
            clockInAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { clockInAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { name: true } },
      lastEditedBy: { select: { name: true } },
      salesOrder: { select: { orderNumber: true } },
      quote: { select: { quoteNumber: true } },
      job: { select: { name: true } },
    },
  });

  const lines: string[] = [];

  if (format === 'paycom') {
    const header = ['EmployeeName', 'EmployeeEmail', 'EmployeeCode', 'Date', 'ClockIn', 'ClockOut', 'Hours', 'EarningCode', 'Department', 'JobCode', 'RecordType', 'RecordRef', 'Status', 'Notes'];
    lines.push(header.join(','));

    for (const row of rows) {
      const recordRef = row.salesOrder?.orderNumber || row.quote?.quoteNumber || row.job?.name || '';
      const day = row.clockInAt.toISOString().slice(0, 10);
      const inLocal = row.clockInAt.toISOString();
      const outLocal = row.clockOutAt ? row.clockOutAt.toISOString() : '';
      const hours = row.minutesWorked ? (row.minutesWorked / 60).toFixed(2) : '';

      lines.push([
        row.user.name,
        row.user.email,
        row.user.id,
        day,
        inLocal,
        outLocal,
        hours,
        'REG',
        '',
        row.job?.name || '',
        row.sourceType,
        recordRef,
        row.status,
        row.notes || '',
      ].map(csvEscape).join(','));
    }
  } else {
    const header = ['Employee', 'Email', 'SourceType', 'Record', 'ClockIn', 'ClockOut', 'Minutes', 'Hours', 'Status', 'ApprovedBy', 'ApprovedAt', 'LastEditedBy', 'LastEditedAt', 'Notes', 'ApprovalNote'];
    lines.push(header.join(','));

    for (const row of rows) {
      const record = row.salesOrder?.orderNumber || row.quote?.quoteNumber || row.job?.name || '';
      const hours = row.minutesWorked ? (row.minutesWorked / 60).toFixed(2) : '';
      lines.push([
        row.user.name,
        row.user.email,
        row.sourceType,
        record,
        row.clockInAt.toISOString(),
        row.clockOutAt ? row.clockOutAt.toISOString() : '',
        row.minutesWorked ?? '',
        hours,
        row.status,
        row.approvedBy?.name || '',
        row.approvedAt ? row.approvedAt.toISOString() : '',
        row.lastEditedBy?.name || '',
        row.lastEditedAt ? row.lastEditedAt.toISOString() : '',
        row.notes || '',
        row.approvalNote || '',
      ].map(csvEscape).join(','));
    }
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="time-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
