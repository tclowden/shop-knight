import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions, withCompany } from '@/lib/api-auth';

function nextReportNumber(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const suffix = String(Math.floor(Math.random() * 900) + 100);
  return `ER-${y}${m}${d}-${suffix}`;
}

export async function GET(req: Request) {
  const auth = await requirePermissions(['expenses.view']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const items = await prisma.expenseReport.findMany({
    where: status && status !== 'ALL'
      ? withCompany(companyId, { status: status as 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REIMBURSED' })
      : withCompany(companyId),
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
      lines: true,
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  const withTotals = items.map((item) => ({
    ...item,
    totalAmount: item.lines.reduce((sum, line) => sum + Number(line.amount || 0), 0),
  }));

  return NextResponse.json(withTotals);
}

export async function POST(req: Request) {
  const auth = await requirePermissions(['expenses.view']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title || '').trim();
  const employeeName = String(body?.employeeName || '').trim();
  if (!title || !employeeName) {
    return NextResponse.json({ error: 'title and employeeName are required' }, { status: 400 });
  }

  const userId = (auth.session.user as { id?: string } | undefined)?.id || null;
  const created = await prisma.expenseReport.create({
    data: {
      companyId,
      reportNumber: nextReportNumber(),
      title,
      employeeName,
      periodStart: body?.periodStart ? new Date(String(body.periodStart)) : null,
      periodEnd: body?.periodEnd ? new Date(String(body.periodEnd)) : null,
      notes: body?.notes ? String(body.notes) : null,
      createdByUserId: userId,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
