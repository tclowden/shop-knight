import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const auth = await requirePermissions(['expenses.view']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const item = await prisma.expenseReport.findFirst({
    where: withCompany(companyId, { id }),
    include: {
      createdByUser: { select: { id: true, name: true, email: true } },
      approvedByUser: { select: { id: true, name: true, email: true } },
      lines: { orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }] },
    },
  });

  if (!item) return NextResponse.json({ error: 'Expense report not found' }, { status: 404 });

  return NextResponse.json({
    ...item,
    totalAmount: item.lines.reduce((sum, line) => sum + Number(line.amount || 0), 0),
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requirePermissions(['expenses.view']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.expenseReport.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Expense report not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || '').trim();
  const userId = (auth.session.user as { id?: string } | undefined)?.id || null;

  const data: {
    title?: string;
    employeeName?: string;
    notes?: string | null;
    periodStart?: Date | null;
    periodEnd?: Date | null;
    status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';
    submittedAt?: Date | null;
    approvedAt?: Date | null;
    reimbursedAt?: Date | null;
    rejectedAt?: Date | null;
    approvedByUserId?: string | null;
  } = {};

  if (action === 'submit') {
    data.status = 'SUBMITTED';
    data.submittedAt = new Date();
  } else if (action === 'approve') {
    data.status = 'APPROVED';
    data.approvedAt = new Date();
    data.rejectedAt = null;
    data.approvedByUserId = userId;
  } else if (action === 'reject') {
    data.status = 'REJECTED';
    data.rejectedAt = new Date();
    data.approvedAt = null;
    data.approvedByUserId = userId;
  } else if (action === 'reimburse') {
    data.status = 'REIMBURSED';
    data.reimbursedAt = new Date();
  } else {
    if (typeof body?.title === 'string') data.title = body.title.trim();
    if (typeof body?.employeeName === 'string') data.employeeName = body.employeeName.trim();
    if (body?.notes !== undefined) data.notes = body.notes ? String(body.notes) : null;
    if (body?.periodStart !== undefined) data.periodStart = body.periodStart ? new Date(String(body.periodStart)) : null;
    if (body?.periodEnd !== undefined) data.periodEnd = body.periodEnd ? new Date(String(body.periodEnd)) : null;
  }

  const updated = await prisma.expenseReport.update({ where: { id }, data });
  return NextResponse.json(updated);
}
