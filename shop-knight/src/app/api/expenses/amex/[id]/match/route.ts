import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requirePermissions(['expenses.view']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const txn = await prisma.amexTransaction.findFirst({ where: withCompany(companyId, { id }) });
  if (!txn) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const expenseLineId = body?.expenseLineId ? String(body.expenseLineId) : '';

  if (!expenseLineId) {
    const updated = await prisma.amexTransaction.update({ where: { id }, data: { status: 'IGNORED', expenseLineId: null } });
    return NextResponse.json(updated);
  }

  const line = await prisma.expenseLine.findFirst({ where: { id: expenseLineId, expenseReport: withCompany(companyId) } });
  if (!line) return NextResponse.json({ error: 'Expense line not found' }, { status: 404 });

  const updated = await prisma.amexTransaction.update({ where: { id }, data: { status: 'MATCHED', expenseLineId } });
  return NextResponse.json(updated);
}
